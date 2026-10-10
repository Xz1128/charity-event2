async function loadHome() {
  const orgWelcome = document.getElementById("org-welcome");
  const orgMission = document.getElementById("org-mission");
  const orgContact = document.getElementById("org-contact");
  const list = document.getElementById("event-list");
  const listError = document.getElementById("home-error");

  try {
    const org = await API.get("/api/organisation");
    document.getElementById("org-name").textContent = org.name;
    document.getElementById("org-tagline").textContent = org.tagline;
    orgWelcome.textContent = org.welcomeMessage;
    orgMission.textContent = org.mission;
    // The shared helper keeps the mailto link behind a format check.
    orgContact.innerHTML = `
      <dt>Email</dt><dd>${safeEmailHtml(org.email)}</dd>
      <dt>Phone</dt><dd>${escapeHtml(org.phone)}</dd>
      <dt>Visit</dt><dd>${escapeHtml(org.address)}</dd>
      <dt>City</dt><dd>${escapeHtml(org.city)}</dd>
    `;
  } catch (err) {
    orgWelcome.textContent =
      "Welcome to Harbour Hope Foundation. We host charity events across the Gold Coast to fund housing, youth wellbeing, and coastal care.";
    orgMission.textContent =
      "Our mission is to connect local causes with people who can show up — by walking, dining, bidding, or singing — and turn ticket sales into practical help.";
  }

  try {
    renderLoading(list, "Loading upcoming events…");
    const events = await API.get("/api/events");
    clearLoading(list);
    if (!events.length) {
      listError.hidden = false;
      listError.className = "banner empty";
      listError.textContent = "There are no upcoming events right now. Please check the search page for past events.";
      list.innerHTML = "";
      return;
    }
    listError.hidden = true;

    // The impact strip reuses the same API response — no second request.
    // The raised total drops cents: whole dollars read better at this scale.
    const raised = events.reduce((sum, event) => sum + Number(event.fundsRaised), 0);
    document.getElementById("impact-raised").textContent = new Intl.NumberFormat(
      "en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }
    ).format(raised);
    document.getElementById("impact-events").textContent = String(events.length);
    document.getElementById("impact-causes").textContent = String(
      new Set(events.map((event) => event.category.name)).size
    );
    document.getElementById("impact").hidden = false;

    renderEventCards(list, events);
  } catch (err) {
    clearLoading(list);
    listError.hidden = false;
    listError.className = "banner error";
    listError.textContent = err.message || "Upcoming events could not be loaded. Please try again shortly.";
  }
}

document.addEventListener("DOMContentLoaded", loadHome);
