function getEventId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadEvent() {
  const root = document.getElementById("event-root");
  const errorBox = document.getElementById("event-error");
  const loading = document.getElementById("event-loading");
  const eventId = getEventId();

  if (!eventId) {
    errorBox.hidden = false;
    errorBox.textContent = "No event was selected. Return to Home or Search and choose an event.";
    return;
  }

  try {
    renderLoading(loading, "Loading event details…");
    const event = await API.get(`/api/events/${encodeURIComponent(eventId)}`);
    resetContainer(loading);
    document.title = `${event.name} · Harbour Hope`;

    const ticketLabel = event.isFree ? "Free admission" : formatMoney(event.ticketPrice);
    root.hidden = false;

    document.getElementById("detail-image").src = event.imageUrl;
    document.getElementById("detail-image").alt = event.name;
    document.getElementById("detail-category").textContent = event.category.name;
    document.getElementById("detail-status").textContent = event.status === "past" ? "Past event" : "Upcoming";
    document.getElementById("detail-status").className = `pill ${event.status === "past" ? "past" : ""}`;
    document.getElementById("detail-name").textContent = event.name;
    document.getElementById("detail-purpose").textContent = event.purpose;
    document.getElementById("detail-when").textContent =
      `${formatDate(event.eventDate)} · ${formatTime(event.startTime)} – ${formatTime(event.endTime)}`;
    document.getElementById("detail-where").textContent =
      `${event.location.venueName}, ${event.location.address}`;
    document.getElementById("detail-description").textContent = event.fullDescription;
    document.getElementById("ticket-price").textContent = ticketLabel;
    document.getElementById("goal-amount").textContent = formatMoney(event.fundraisingGoal);
    document.getElementById("raised-amount").textContent = formatMoney(event.fundsRaised);
    document.getElementById("progress-bar").style.width = `${event.progressPercent}%`;
    document.getElementById("progress-label").textContent = `${event.progressPercent}% of the goal`;

    const registerLink = document.getElementById("register-link");
    registerLink.href = `register.html?id=${encodeURIComponent(event.eventId)}`;
    const registrationList = document.getElementById("registration-list");
    const registrationError = document.getElementById("registration-error");
    const registrations = Array.isArray(event.registrations) ? event.registrations : [];
    if (!registrations.length) {
      registrationList.innerHTML = '<p class="hint">No registrations have been recorded for this event yet.</p>';
    } else {
      registrationList.innerHTML = registrations.map((registration) => `
        <article class="registration-row">
          <div>
            <strong>${escapeHtml(registration.fullName)}</strong>
            <p class="hint">Registered ${formatRegistrationDate(registration.registeredAt)}</p>
          </div>
          <span class="pill">${Number(registration.tickets)} ticket${Number(registration.tickets) === 1 ? "" : "s"}</span>
        </article>
      `).join("");
    }

    if (event.status === "past") {
      // The input fields are disabled so the page shows that registration has
      // closed, but the Register button stays active on purpose: the brief
      // requires a click on it to raise the placeholder dialog, and a disabled
      // button would make the required behaviour unobservable.
      registerLink.setAttribute("aria-disabled", "true");
      registerLink.classList.add("disabled-link");
      registerLink.href = "#";
      registerLink.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();
        alert("Registration is closed for past events.");
      });
      document.getElementById("register-note").textContent =
        "This event has already been held, so ticket registration is closed.";
    }
  } catch (err) {
    resetContainer(loading);
    errorBox.hidden = false;
    errorBox.textContent = err.message || "This event could not be loaded.";
  }
}

function formatRegistrationDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? escapeHtml(value)
    : date.toLocaleString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit"
      });
}

document.addEventListener("DOMContentLoaded", loadEvent);
