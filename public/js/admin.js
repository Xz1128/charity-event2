const adminList = document.getElementById("admin-event-list");
const adminMessage = document.getElementById("admin-message");
const eventForm = document.getElementById("event-form");
let adminEvents = [];

function adminNotice(text, type = "info") {
  adminMessage.hidden = false;
  adminMessage.className = `banner ${type}`;
  adminMessage.textContent = text;
}
function clearAdminNotice() {
  adminMessage.hidden = true;
  adminMessage.textContent = "";
}
function displayAdminDate(date) {
  return date ? formatDate(String(date).slice(0, 10)) : "Date unavailable";
}

async function loadAdminOptions() {
  const locations = await API.get("/api/locations");
  const locationSelect = document.getElementById("locationId");
  locationSelect.innerHTML = '<option value="">Choose a venue</option>';
  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location.locationId;
    option.textContent = `${location.venueName} — ${location.suburb}`;
    locationSelect.appendChild(option);
  });
}

async function loadAdminEvents() {
  adminList.innerHTML = '<p class="hint">Loading events…</p>';
  try {
    adminEvents = await API.get("/api/admin/events");
    if (!adminEvents.length) {
      adminList.innerHTML = '<p class="banner empty">No events found.</p>';
      return;
    }
    adminList.innerHTML = adminEvents.map((event) => `
      <article class="admin-event">
        <div class="admin-event-heading">
          <div>
            <h3>${escapeHtml(event.name)}</h3>
            <p class="meta">${displayAdminDate(event.eventDate)} · ${escapeHtml(event.location.venueName)}</p>
          </div>
          <span class="pill ${event.isSuspended ? "past" : ""}">${event.isSuspended ? "Suspended" : event.status === "past" ? "Past" : "Upcoming"}</span>
        </div>
        <p class="meta">${escapeHtml(event.category.name)} · ${formatMoney(event.ticketPrice)} · ${event.registrationCount || 0} registrations</p>
        <div class="form-actions">
          <button class="btn" type="button" data-edit="${event.eventId}">Edit</button>
          <button class="btn secondary" type="button" data-delete="${event.eventId}">Delete</button>
        </div>
      </article>
    `).join("");
  } catch (err) {
    adminList.innerHTML = "";
    adminNotice(err.message || "Could not load events.", "error");
  }
}

let adminCategories = [];

async function loadAdminCategories() {
  adminCategories = await API.get("/api/categories");
  const list = document.getElementById("admin-category-list");
  if (!adminCategories.length) {
    list.innerHTML = '<p class="hint">No categories found.</p>';
  } else {
    list.innerHTML = adminCategories.map((category) => `
      <article class="admin-event">
        <h3>${escapeHtml(category.name)}</h3>
        <p class="meta">${escapeHtml(category.description)}</p>
        <div class="form-actions">
          <button class="btn" type="button" data-category-edit="${category.categoryId}">Edit</button>
          <button class="btn secondary" type="button" data-category-delete="${category.categoryId}">Delete</button>
        </div>
      </article>
    `).join("");
  }
  const select = document.getElementById("categoryId");
  const current = select.value;
  select.innerHTML = '<option value="">Choose a category</option>';
  adminCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.categoryId;
    option.textContent = category.name;
    select.appendChild(option);
  });
  if (current) select.value = current;
}

function clearCategoryForm() {
  document.getElementById("category-form").reset();
  document.getElementById("categoryEditId").value = "";
  document.getElementById("save-category").textContent = "Add category";
}

document.getElementById("category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("categoryEditId").value;
  const body = {
    name: document.getElementById("categoryName").value.trim(),
    description: document.getElementById("categoryDescription").value.trim()
  };
  if (!body.name || !body.description) {
    alert("Please enter both a category name and description.");
    return;
  }
  try {
    const response = await fetch(id ? `/api/categories/${encodeURIComponent(id)}` : "/api/categories", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Category could not be saved.");
    adminNotice(payload.message || "Category saved.");
    clearCategoryForm();
    await loadAdminCategories();
  } catch (err) {
    adminNotice(err.message || "Category could not be saved.", "error");
  }
});

document.getElementById("admin-category-list").addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-category-edit]");
  const remove = event.target.closest("[data-category-delete]");
  if (edit) {
    const category = adminCategories.find((item) => Number(item.categoryId) === Number(edit.dataset.categoryEdit));
    if (!category) return;
    document.getElementById("categoryEditId").value = category.categoryId;
    document.getElementById("categoryName").value = category.name;
    document.getElementById("categoryDescription").value = category.description;
    document.getElementById("save-category").textContent = "Save category";
    return;
  }
  if (remove) {
    const category = adminCategories.find((item) => Number(item.categoryId) === Number(remove.dataset.categoryDelete));
    if (!category || !confirm(`Delete category "${category.name}"? Categories used by events cannot be deleted.`)) return;
    try {
      const response = await fetch(`/api/categories/${category.categoryId}`, { method: "DELETE", headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Category could not be deleted.");
      adminNotice(payload.message || "Category deleted.");
      await loadAdminCategories();
    } catch (err) {
      adminNotice(err.message || "Category could not be deleted.", "error");
    }
  }
});
document.getElementById("clear-category").addEventListener("click", clearCategoryForm);

function getFormEvent() {
  return {
    organisationId: Number(document.getElementById("organisationId").value || 1),
    name: document.getElementById("name").value.trim(),
    purpose: document.getElementById("purpose").value.trim(),
    shortDescription: document.getElementById("shortDescription").value.trim(),
    fullDescription: document.getElementById("fullDescription").value.trim(),
    eventDate: document.getElementById("eventDate").value,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    categoryId: Number(document.getElementById("categoryId").value),
    locationId: Number(document.getElementById("locationId").value),
    ticketPrice: Number(document.getElementById("ticketPrice").value),
    fundraisingGoal: Number(document.getElementById("fundraisingGoal").value),
    fundsRaised: Number(document.getElementById("fundsRaised").value || 0),
    imageUrl: document.getElementById("imageUrl").value.trim(),
    isSuspended: document.getElementById("isSuspended").checked ? 1 : 0
  };
}

function resetEventForm() {
  eventForm.reset();
  document.getElementById("eventId").value = "";
  document.getElementById("organisationId").value = "1";
  document.getElementById("ticketPrice").value = "0";
  document.getElementById("fundraisingGoal").value = "1000";
  document.getElementById("fundsRaised").value = "0";
  document.getElementById("imageUrl").value = "/images/event-1.jpg";
  document.getElementById("editor-title").textContent = "Create an event";
  document.getElementById("save-event").textContent = "Save event";
  document.getElementById("editor-registrations").hidden = true;
}

async function editEvent(eventId) {
  clearAdminNotice();
  const event = adminEvents.find((item) => Number(item.eventId) === Number(eventId));
  if (!event) return adminNotice("The selected event could not be found.", "error");
  document.getElementById("eventId").value = event.eventId;
  document.getElementById("organisationId").value = event.organisationId;
  document.getElementById("name").value = event.name;
  document.getElementById("purpose").value = event.purpose;
  document.getElementById("shortDescription").value = event.shortDescription;
  document.getElementById("fullDescription").value = event.fullDescription;
  document.getElementById("eventDate").value = String(event.eventDate).slice(0, 10);
  document.getElementById("startTime").value = String(event.startTime).slice(0, 5);
  document.getElementById("endTime").value = String(event.endTime).slice(0, 5);
  document.getElementById("categoryId").value = event.categoryId;
  document.getElementById("locationId").value = event.locationId;
  document.getElementById("ticketPrice").value = event.ticketPrice;
  document.getElementById("fundraisingGoal").value = event.fundraisingGoal;
  document.getElementById("fundsRaised").value = event.fundsRaised;
  document.getElementById("imageUrl").value = event.imageUrl;
  document.getElementById("isSuspended").checked = event.isSuspended;
  document.getElementById("editor-title").textContent = `Update event #${event.eventId}`;
  document.getElementById("save-event").textContent = "Save changes";
  document.getElementById("editor-registrations").hidden = false;
  const registrationList = document.getElementById("editor-registration-list");
  registrationList.innerHTML = '<p class="hint">Loading registrations…</p>';
  document.getElementById("event-editor").scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const registrations = await API.get(`/api/events/${event.eventId}/registrations`);
    if (!registrations.length) {
      registrationList.innerHTML = '<p class="hint">No registrations for this event.</p>';
    } else {
      registrationList.innerHTML = registrations.map((reg) => `
        <div class="registration-row">
          <div><strong>${escapeHtml(reg.fullName)}</strong>
            <p class="hint">${escapeHtml(reg.email)} · ${escapeHtml(reg.phone)}</p>
            <p class="hint">${escapeHtml(String(reg.registeredAt))}</p></div>
          <span class="pill">${reg.tickets} ticket${reg.tickets === 1 ? "" : "s"}</span>
        </div>
      `).join("");
    }
  } catch (err) {
    registrationList.textContent = err.message || "Could not load registrations.";
  }
}

adminList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    await editEvent(editButton.dataset.edit);
    return;
  }
  if (deleteButton) {
    const eventId = Number(deleteButton.dataset.delete);
    const item = adminEvents.find((entry) => Number(entry.eventId) === eventId);
    if (!item || !confirm(`Delete "${item.name}"? Events with registrations cannot be deleted.`)) return;
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE", headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Delete failed.");
      adminNotice(payload.message || "Event deleted.");
      resetEventForm();
      await loadAdminEvents();
    } catch (err) {
      adminNotice(err.message || "Could not delete event.", "error");
    }
  }
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAdminNotice();
  if (!eventForm.reportValidity()) return;
  const body = getFormEvent();
  if (body.endTime <= body.startTime) {
    alert("End time must be later than start time.");
    return;
  }
  if (body.fundraisingGoal <= 0 || body.ticketPrice < 0 || body.fundsRaised < 0) {
    alert("Please enter valid non-negative amounts and a goal greater than zero.");
    return;
  }
  const id = document.getElementById("eventId").value;
  const button = document.getElementById("save-event");
  button.disabled = true;
  try {
    const response = await fetch(id ? `/api/events/${encodeURIComponent(id)}` : "/api/events", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Save failed.");
    adminNotice(payload.message || "Event saved successfully.");
    resetEventForm();
    await loadAdminEvents();
  } catch (err) {
    adminNotice(err.message || "Unable to save event.", "error");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("new-event").addEventListener("click", () => {
  resetEventForm();
  document.getElementById("event-editor").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("cancel-edit").addEventListener("click", resetEventForm);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAdminOptions();
    await loadAdminCategories();
    await loadAdminEvents();
  } catch (err) {
    adminNotice(err.message || "Could not load form options.", "error");
  }
});
