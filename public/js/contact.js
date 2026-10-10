/**
 * Loads the organisation contact details into the contact page.
 *
 * Reads the profile from the organisation API and fills the definition list.
 * When the API is unavailable the hard-coded fallback in the HTML stays in
 * place, so the page still shows usable contact information.
 *
 * @returns {Promise<void>} Resolves once the details have been filled or the
 *   fallback has been kept.
 */
async function loadContactDetails() {
  const details = document.getElementById("org-details");
  try {
    const org = await API.get("/api/organisation");
    details.innerHTML = `
      <dt>Email</dt><dd>${safeEmailHtml(org.email)}</dd>
      <dt>Phone</dt><dd>${escapeHtml(org.phone)}</dd>
      <dt>Visit</dt><dd>${escapeHtml(org.address)}</dd>
      <dt>City</dt><dd>${escapeHtml(org.city)}</dd>
      <dt>Website</dt><dd>${safeWebsiteHtml(org.website)}</dd>
    `;
  } catch (err) {
    // Keeps the static fallback content already present in the markup.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadContactDetails();

  document.getElementById("contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    alert("This feature is currently under construction.");
  });
});
