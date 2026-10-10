const form = document.getElementById("search-form");
const results = document.getElementById("search-results");
const message = document.getElementById("search-message");
const categorySelect = document.getElementById("categoryId");

function showMessage(text, type) {
  message.hidden = false;
  message.className = `banner ${type}`;
  message.textContent = text;
}

function clearMessage() {
  message.hidden = true;
  message.textContent = "";
}

async function loadCategories() {
  try {
    const categories = await API.get("/api/categories");
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = String(category.categoryId);
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  } catch (err) {
    showMessage("Categories could not be loaded, but you can still search by date or location.", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  resetContainer(results);

  const date = document.getElementById("date").value.trim();
  const location = document.getElementById("location").value.trim();
  const categoryId = categorySelect.value.trim();

  if (!date && !location && !categoryId) {
    showMessage("Select at least one filter before searching: date, location, or category.", "error");
    return;
  }

  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (location) params.set("location", location);
  if (categoryId) params.set("categoryId", categoryId);

  try {
    renderLoading(results, "Searching events…");
    const events = await API.get(`/api/events/search?${params.toString()}`);
    clearLoading(results);
    if (!events.length) {
      showMessage("No events matched those filters. Try another date, suburb, or category.", "empty");
      return;
    }
    showMessage(`${events.length} event${events.length === 1 ? "" : "s"} found.`, "info");
    renderEventCards(results, events);
  } catch (err) {
    clearLoading(results);
    showMessage(err.message || "Search failed. Please check your filters and try again.", "error");
  }
});

document.getElementById("clear-filters").addEventListener("click", () => {
  form.reset();
  resetContainer(results);
  clearMessage();
  document.getElementById("date").focus();
});

document.addEventListener("DOMContentLoaded", loadCategories);
