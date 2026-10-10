const registrationParams = new URLSearchParams(window.location.search);
const selectedEventId = registrationParams.get("id");
let selectedEvent = null;

function showRegistrationMessage(id, message, type = "error") {
  const box = document.getElementById(id);
  box.hidden = false;
  box.className = `banner ${type}`;
  box.textContent = message;
}

async function loadSelectedEvent() {
  const box = document.getElementById("selected-event");
  if (!selectedEventId || !/^\d+$/.test(selectedEventId)) {
    box.innerHTML = '<p class="banner error">No valid event was selected. Return to Search events and choose an event.</p>';
    document.getElementById("registration-form").hidden = true;
    return;
  }
  try {
    selectedEvent = await API.get(`/api/events/${encodeURIComponent(selectedEventId)}`);
    box.innerHTML = `
      <div class="selected-event">
        <img src="${escapeHtml(selectedEvent.imageUrl)}" alt="${escapeHtml(selectedEvent.name)}">
        <div>
          <p class="eyebrow">${escapeHtml(selectedEvent.category.name)}</p>
          <h2>${escapeHtml(selectedEvent.name)}</h2>
          <p>${escapeHtml(selectedEvent.purpose)}</p>
          <p class="meta">${formatDate(selectedEvent.eventDate)} · ${escapeHtml(selectedEvent.location.venueName)}</p>
          <p><strong>Ticket price:</strong> ${formatMoney(selectedEvent.ticketPrice)}</p>
        </div>
      </div>`;
    document.getElementById("back-to-event").href = `event.html?id=${encodeURIComponent(selectedEvent.eventId)}`;
    if (selectedEvent.status === "past") {
      document.getElementById("registration-form").hidden = true;
      showRegistrationMessage("register-error", "Registration is closed for this past event.");
    }
  } catch (err) {
    box.innerHTML = "";
    showRegistrationMessage("register-error", err.message || "Unable to load the selected event.");
    document.getElementById("registration-form").hidden = true;
  }
}

document.getElementById("registration-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  document.getElementById("register-error").hidden = true;
  document.getElementById("register-success").hidden = true;
  if (!selectedEvent) {
    showRegistrationMessage("register-error", "Please select a valid event first.");
    return;
  }
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const tickets = Number(document.getElementById("tickets").value);
  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length < 5 || !Number.isInteger(tickets) || tickets < 1 || tickets > 10) {
    alert("Please check your name, email, phone number, and ticket quantity (1–10).");
    return;
  }
  const submitButton = document.getElementById("submit-registration");
  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";
  try {
    const result = await fetch(`/api/events/${encodeURIComponent(selectedEventId)}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ fullName, email, phone, tickets })
    });
    const payload = await result.json();
    if (!result.ok) throw new Error(payload.error || "Registration could not be completed.");
    showRegistrationMessage(
      "register-success",
      `Thank you, ${fullName}! Your registration is confirmed for ${selectedEvent.name}. You registered for ${tickets} ticket${tickets === 1 ? "" : "s"}.`,
      "info"
    );
    document.getElementById("registration-form").reset();
    document.getElementById("registration-form").hidden = true;
    document.getElementById("back-to-event").textContent = "Return to event details";
  } catch (err) {
    showRegistrationMessage("register-error", err.message || "Registration failed. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Complete registration";
  }
});

document.addEventListener("DOMContentLoaded", loadSelectedEvent);
