/**
 * Thin wrapper around fetch() for every page on the site.
 *
 * Keeps the request concerns in one place: it asks for JSON, parses the body
 * once, and converts a non-2xx response into a thrown Error carrying the
 * server's "error" message. Callers therefore only need a try/catch around an
 * await, and can show err.message directly to the user.
 *
 * @constant {Object}
 */
const API = {
  /**
   * Performs a GET request and resolves with the parsed JSON body.
   *
   * @param {string} path - Absolute path on this origin, for example
   *   "/api/events/search?location=Southport".
   * @returns {Promise<*>} The parsed response body.
   * @throws {Error} When the response is not ok. The error carries the server's
   *   message and a "status" property holding the HTTP status code. A network
   *   failure propagates the original TypeError from fetch().
   */
  async get(path) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    let payload = null;
    try {
      payload = await response.json();
    } catch (err) {
      payload = null;
    }
    if (!response.ok) {
      const message = (payload && payload.error) || "The request could not be completed.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }
};

/**
 * Formats an ISO date string for display.
 *
 * @param {string} isoDate - Date in YYYY-MM-DD form, as returned by the API.
 * @returns {string} A readable date such as "Mon, 12 October 2026".
 */
function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/**
 * Formats a numeric amount as Australian currency.
 *
 * @param {number|string} amount - The amount, typically a DECIMAL sent as a string.
 * @returns {string} The amount with the AUD symbol and thousands separators.
 */
function formatMoney(amount) {
  return Number(amount).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD"
  });
}

/**
 * Converts a MySQL TIME value into a readable local time.
 *
 * @param {string|null} time - Time in HH:MM:SS form, or null when unknown.
 * @returns {string} A readable time such as "6:30 am", or an empty string when
 *   no time was supplied.
 */
function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

/**
 * Escapes text so it can be placed inside an HTML string safely.
 *
 * Used on every value interpolated into a template literal that is later written
 * with innerHTML, so database text cannot inject markup.
 *
 * @param {*} value - Any value; it is coerced to a string first.
 * @returns {string} The text with the four HTML metacharacters replaced by entities.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds a safe mailto link for an email address.
 *
 * The address must pass a format check before it may enter an href, so a
 * "javascript:" value cannot bypass escapeHtml.
 *
 * @param {string} email - The address to render, or a falsy value.
 * @returns {string} An anchor element, or escaped plain text when the address
 *   is missing or malformed.
 */
function safeEmailHtml(email) {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
    : escapeHtml(email || "Not provided");
}

/**
 * Builds a safe external link for a website URL.
 *
 * Only http and https URLs are accepted, so other URL schemes cannot be turned
 * into executable links.
 *
 * @param {string} url - The URL to render, or a falsy value.
 * @returns {string} An anchor element, or escaped plain text when the URL is
 *   missing or uses another scheme.
 */
function safeWebsiteHtml(url) {
  return url && /^https?:\/\//i.test(url)
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`
    : escapeHtml(url || "Not provided");
}

/**
 * Builds an "In N days" pill for upcoming events, so visitors can sense how
 * soon a fundraiser happens without doing date math themselves. Past events
 * return nothing (their Past pill already says where they stand), and the
 * zero/one-day edges get friendlier wording than "In 0 days".
 *
 * @param {Object} event - An event summary from the API.
 * @param {string} event.status - "upcoming" or "past".
 * @param {string} event.eventDate - Event date as YYYY-MM-DD.
 * @returns {string} A pill element, or an empty string for past events.
 */
function countdownLabel(event) {
  if (event.status !== "upcoming") return "";
  const eventDay = new Date(`${event.eventDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((eventDay - today) / 86400000);
  let label;
  if (days <= 0) {
    label = "Today";
  } else if (days === 1) {
    label = "Tomorrow";
  } else {
    label = `In ${days} days`;
  }
  return `<span class="pill soon">${label}</span>`;
}

/**
 * Builds the HTML markup for a single event card.
 *
 * Returns a link wrapper so the whole card is clickable, matching the home and
 * search page requirement that each result links to the detail page.
 *
 * @param {Object} event - An event summary from the API.
 * @param {string} event.eventId - Identifier used to build the detail page link.
 * @param {string} event.name - Event title.
 * @param {string} event.status - Either "upcoming" or "past", used for the pill.
 * @param {boolean} event.isFree - When true, a Free pill is added.
 * @param {string} event.eventDate - Date shown under the title.
 * @param {string} event.imageUrl - Card image source.
 * @param {string} event.shortDescription - One-line summary.
 * @param {Object} event.category - Category object with a "name" property.
 * @param {Object} event.location - Location object with a "suburb" property.
 * @returns {string} An anchor element as an HTML string.
 */
function eventCardHtml(event) {
  const statusClass = event.status === "past" ? "past" : "";
  const freePill = event.isFree ? '<span class="pill free">Free</span>' : "";
  const soonPill = countdownLabel(event);
  return `
    <a class="event-card" href="event.html?id=${encodeURIComponent(event.eventId)}">
      <img src="${escapeHtml(event.imageUrl)}"
           alt="${escapeHtml(event.name)}"
           width="1200" height="675"
           loading="lazy" decoding="async">
      <div class="card-body">
        <div class="pills">
          <span class="pill">${escapeHtml(event.category.name)}</span>
          <span class="pill ${statusClass}">${event.status === "past" ? "Past" : "Upcoming"}</span>
          ${soonPill}
          ${freePill}
        </div>
        <h3>${escapeHtml(event.name)}</h3>
        <p class="meta">${formatDate(event.eventDate)} · ${escapeHtml(event.location.suburb)}</p>
        <p class="meta">${escapeHtml(event.shortDescription)}</p>
        <div class="progress mini" aria-hidden="true"><span></span></div>
        <p class="meta card-goal">${event.progressPercent}% of goal · ${formatMoney(event.fundsRaised)} raised</p>
      </div>
    </a>
  `;
}

/**
 * Renders a list of events into a container element.
 *
 * Replaces the container's contents, so calling it again after a new search
 * clears the previous results rather than appending to them.
 *
 * @param {HTMLElement} container - The element that receives the cards.
 * @param {Array<Object>} events - Event summaries from the API.
 * @returns {void}
 */
function renderEventCards(container, events) {
  container.innerHTML = events.map(eventCardHtml).join("");
  // Fill the goal-bar widths from JavaScript: assigning el.style.width is
  // allowed by style-src 'self', whereas a style="width:..%" attribute inside
  // the markup would be refused by the Content-Security-Policy. Cards and
  // events map one-to-one, so index order matches.
  container.querySelectorAll(".progress.mini > span").forEach((bar, index) => {
    const event = events[index];
    if (event) {
      bar.style.width = `${event.progressPercent}%`;
    }
  });
}

/**
 * Shows a spinner and message inside a container while data is being fetched.
 *
 * The API answers on localhost almost instantly, but a slow connection or a
 * cold database would otherwise leave a blank area and look broken. Announcing
 * the wait with role="status" also tells screen-reader users what is happening.
 *
 * @param {HTMLElement} container - The element that will hold the results.
 * @param {string} [text="Loading…"] - Message shown beside the spinner.
 * @returns {void}
 */
function renderLoading(container, text = "Loading…") {
  container.innerHTML = `
    <div class="loading" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}

/**
 * Removes the loading placeholder from a container.
 *
 * @param {HTMLElement} container - The element that held the placeholder.
 * @returns {void}
 */
function clearLoading(container) {
  const loading = container.querySelector(".loading");
  if (loading) loading.remove();
}

/**
 * Clears the loading placeholder and returns the container to an empty grid.
 *
 * @param {HTMLElement} container - The results container to reset.
 * @returns {void}
 */
function resetContainer(container) {
  container.innerHTML = "";
}

// Broken images are hidden instead of showing the browser's broken-image
// icon. The listener lives on the document in the capture phase because
// "error" events from <img> elements do not bubble. It replaces the old
// inline onerror attribute on card images, which the Content-Security-Policy
// (script-src 'self', no 'unsafe-inline') would refuse to run. Assigning
// style properties from JavaScript is still allowed: style-src only blocks
// style attributes in markup and cssText, not individual CSSOM assignments.
document.addEventListener(
  "error",
  (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.style.display = "none";
    }
  },
  true
);

// Global safety net — unexpected runtime errors never leave a page silently broken.
window.addEventListener("error", (event) => {
  console.error("[Global error]", event.message, event.filename, event.lineno);
  showFatalMessage(
    "Something went wrong while loading this page. Please refresh or try again later."
  );
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled promise rejection]", event.reason);
  showFatalMessage(
    "Something went wrong while loading this page. Please refresh or try again later."
  );
});

// Shared fallback banner — any page that has an error container can display it.
function showFatalMessage(text) {
  const candidates = [
    document.getElementById("home-error"),
    document.getElementById("search-message"),
    document.getElementById("event-error"),
    document.getElementById("contact-error"),
  ];
  for (const box of candidates) {
    if (box) {
      box.hidden = false;
      box.className = "banner error";
      box.textContent = text;
      break;
    }
  }
}
