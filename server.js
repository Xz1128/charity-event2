/**
 * server.js
 * Express REST API + static client for Harbour Hope charity events.
 *
 * Assessment 3 REST API: public event browsing, registrations, and admin event CRUD.
 *
 * Endpoints
 *   GET /api/organisation          — static-feeling org profile from the database
 *   GET /api/categories            — list of event categories for the search form
 *   GET /api/events                — home: current + upcoming, not suspended
 *   GET /api/events/search         — filter by date, location, category (AND)
 *   GET /api/events/:id            — full detail for one public event
 *
 * Security notes
 *   - All filters use bound parameters (no string-concatenated SQL).
 *   - Suspended events are omitted from list/search/detail (404).
 *   - CORS is enabled so Postman and a separately hosted front-end can call the API.
 */
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { pool, testConnection } = require("./event_db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// Security response headers, written by hand instead of using helmet because
// the brief only allows the four dependencies already listed in package.json.
// Each header closes one class of attack:
// - X-Content-Type-Options "nosniff": the browser must trust the declared MIME
//   type, so a JSON or HTML response can never be re-interpreted as script.
// - X-Frame-Options "DENY" plus CSP frame-ancestors 'none': the site cannot be
//   framed by another site, which blocks clickjacking.
// - Referrer-Policy: outbound links only reveal this site's origin, never the
//   full URL a visitor was reading.
// - Content-Security-Policy: pages may only load and run files that this site
//   serves itself ('self'), so injected markup cannot pull scripts, styles or
//   images from anywhere else. The site has no inline scripts or styles, so
//   'unsafe-inline' is not needed.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; " +
      "connect-src 'self' https://api.open-meteo.com; font-src 'self'; object-src 'none'; " +
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  next();
});
// Serve the compiled Angular bundles. The client app (charity-client) is served
// from the site root, and the admin app (charity-admin) from /admin/. Both apps
// use hash-based routing, so no server-side fallback route is needed: a page
// refresh at any Angular route still loads the single index.html shell.
//
// The builds are located under each project's dist/<name>/browser directory.
const CLIENT_DIST = path.join(__dirname, "charity-client", "dist", "charity-client", "browser");
const ADMIN_DIST = path.join(__dirname, "charity-admin", "dist", "charity-admin", "browser");

const staticOptions = {
  setHeaders: (res, filePath) => {
    // HTML, CSS and JS change during development, so the browser must revalidate
    // them on every load instead of trusting its cache.
    if (/\.(html|css|js)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
};

// The admin bundle must be mounted before the client bundle so that /admin/
// resolves to the admin app rather than the client's index.html.
app.use("/admin", express.static(ADMIN_DIST, staticOptions));
app.use(express.static(CLIENT_DIST, staticOptions));

// Legacy fallback: keep the original vanilla-JS client working when the Angular
// bundles have not been built yet (for example during a first-time checkout).
app.use(express.static(path.join(__dirname, "public"), staticOptions));

/**
 * Shared projection used by the list, search, and detail endpoints so that all
 * three return the same shape of joined data.
 *
 * Joins events to its category, location, and organisation, and derives the
 * "status" column from the event date relative to the database server date.
 * Callers append their own WHERE and ORDER BY clauses.
 *
 * @constant {string}
 */
const EVENT_SELECT = `
  SELECT
    e.event_id,
    e.name,
    e.purpose,
    e.short_description,
    e.full_description,
    e.event_date,
    e.start_time,
    e.end_time,
    e.ticket_price,
    e.fundraising_goal,
    e.funds_raised,
    e.is_suspended,
    e.image_url,
    (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registration_count,
    c.category_id,
    c.name AS category_name,
    l.location_id,
    l.venue_name,
    l.suburb,
    l.city,
    l.address AS venue_address,
    l.latitude,
    l.longitude,
    o.organisation_id,
    o.name AS organisation_name,
    CASE
      WHEN e.event_date >= CURDATE() THEN 'upcoming'
      ELSE 'past'
    END AS status
  FROM events e
  INNER JOIN categories c ON c.category_id = e.category_id
  INNER JOIN locations l ON l.location_id = e.location_id
  INNER JOIN organisations o ON o.organisation_id = e.organisation_id
`;

/**
 * Maps one joined database row into the public JSON shape sent to the browser.
 *
 * Converts snake_case column names to camelCase, coerces DECIMAL strings to
 * numbers, and derives the business fields the client must not recompute:
 * "status" (upcoming/past), "isFree", and "progressPercent".
 *
 * @param {Object} row - A row produced by EVENT_SELECT.
 * @param {Object} [options] - Optional mapping settings.
 * @param {boolean} [options.includeFull=false] - When true, includes the long
 *   "fullDescription" field. List and search endpoints leave this false to keep
 *   payloads small; only the detail endpoint sets it true.
 * @returns {Object} The event in camelCase, ready to be serialised as JSON.
 */
function toPublicEvent(row, { includeFull = false } = {}) {
  const goal = Number(row.fundraising_goal);
  const raised = Number(row.funds_raised);
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  const event = {
    eventId: row.event_id,
    name: row.name,
    purpose: row.purpose,
    shortDescription: row.short_description,
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    ticketPrice: Number(row.ticket_price),
    isFree: Number(row.ticket_price) === 0,
    fundraisingGoal: goal,
    fundsRaised: raised,
    progressPercent: percent,
    imageUrl: row.image_url,
    registrationCount: Number(row.registration_count || 0),
    status: row.status,
    category: {
      id: row.category_id,
      name: row.category_name
    },
    location: {
      id: row.location_id,
      venueName: row.venue_name,
      suburb: row.suburb,
      city: row.city,
      address: row.venue_address,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null
    },
    organisationName: row.organisation_name
  };

  if (includeFull) {
    event.fullDescription = row.full_description;
  }

  return event;
}

/**
 * Responds with the single organisation profile shown on the home page.
 *
 * Returns only the first organisation, since this assessment models one charity.
 *
 * @param {import("express").Request} _req - Unused; the resource takes no input.
 * @param {import("express").Response} res - Sends the profile object, or 404 when
 *   the organisations table is empty, or 500 when the query fails.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
app.get("/api/organisation", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT organisation_id, name, tagline, welcome_message, mission,
              email, phone, address, city, website
       FROM organisations
       ORDER BY organisation_id
       LIMIT 1`
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Organisation profile was not found." });
    }
    const org = rows[0];
    res.json({
      organisationId: org.organisation_id,
      name: org.name,
      tagline: org.tagline,
      welcomeMessage: org.welcome_message,
      mission: org.mission,
      email: org.email,
      phone: org.phone,
      address: org.address,
      city: org.city,
      website: org.website
    });
  } catch (err) {
    console.error("GET /api/organisation", err);
    res.status(500).json({ error: "Unable to load organisation details." });
  }
});

/**
 * Responds with every event category, ordered by name.
 *
 * The search page calls this to populate its category dropdown, so the options
 * stay in step with the categories table instead of being hard-coded in HTML.
 *
 * @param {import("express").Request} _req - Unused; the resource takes no input.
 * @param {import("express").Response} res - Sends an array of category objects,
 *   or 500 when the query fails.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
app.get("/api/categories", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category_id, name, description
       FROM categories
       ORDER BY name`
    );
    res.json(
      rows.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        description: row.description
      }))
    );
  } catch (err) {
    console.error("GET /api/categories", err);
    res.status(500).json({ error: "Unable to load categories." });
  }
});

/**
 * Responds with the events shown on the home page.
 *
 * Applies two rules: suspended events are excluded, and only events dated today
 * or later are returned. Past events stay in the database but are not listed here.
 *
 * @param {import("express").Request} _req - Unused; the listing takes no filters.
 * @param {import("express").Response} res - Sends an array of event summaries,
 *   or 500 when the query fails.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
app.get("/api/events", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `${EVENT_SELECT}
       WHERE e.is_suspended = 0
         AND e.event_date >= CURDATE()
       ORDER BY e.event_date ASC, e.start_time ASC`
    );
    res.json(rows.map((row) => toPublicEvent(row)));
  } catch (err) {
    console.error("GET /api/events", err);
    res.status(500).json({ error: "Unable to load upcoming events." });
  }
});

/**
 * Responds with events matching any combination of the search filters.
 *
 * Filters are combined with AND, and both the clauses and their values are built
 * together so every value is passed as a bound parameter. Suspended events are
 * always excluded, but past events are returned when they match, so a search can
 * still retrieve history.
 *
 * This route is registered before "/api/events/:id" so the literal path segment
 * "search" is never parsed as an event id.
 *
 * @param {import("express").Request} req - Reads the optional query parameters
 *   "date" (YYYY-MM-DD), "location" (partial venue/suburb/city/address match, max
 *   80 characters), and "categoryId" (positive integer).
 * @param {import("express").Response} res - Sends the matching events, 400 when no
 *   filter is supplied, a filter is malformed, or the date is not a real calendar
 *   day, or 500 when the query fails.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
app.get("/api/events/search", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date.trim() : "";
    const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
    const categoryIdRaw =
      typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";

    if (!date && !location && !categoryIdRaw) {
      return res.status(400).json({
        error: "Please choose at least one filter: date, location, or category."
      });
    }

    const clauses = ["e.is_suspended = 0"];
    const params = [];

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Date must use the format YYYY-MM-DD." });
      }

      // The regex above only checks the shape, so "2026-02-30" and "2026-99-99"
      // would reach MySQL, make the query fail, and turn a user mistake into a
      // 500. Build the date and compare the parts back: JavaScript normalises
      // out-of-range fields (month 13, day 31 of a 30-day month, 29 February of
      // a non-leap year), so a round trip only succeeds for a real calendar day.
      // The year is also kept inside the range the MySQL DATE column accepts.
      const [year, month, day] = date.split("-").map(Number);
      const probe = new Date(year, month - 1, day);
      const isRealDate =
        probe.getFullYear() === year &&
        probe.getMonth() === month - 1 &&
        probe.getDate() === day &&
        year >= 1000 &&
        year <= 9999;

      if (!isRealDate) {
        return res.status(400).json({
          error: "Date must be a real calendar date (for example 2026-10-12)."
        });
      }

      clauses.push("e.event_date = ?");
      params.push(date);
    }

    if (location) {
      if (location.length > 80) {
        return res.status(400).json({ error: "Location search is too long." });
      }
      clauses.push("(l.venue_name LIKE ? OR l.suburb LIKE ? OR l.city LIKE ? OR l.address LIKE ?)");
      const like = `%${location}%`;
      params.push(like, like, like, like);
    }

    if (categoryIdRaw) {
      const categoryId = Number(categoryIdRaw);
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({ error: "Category is not valid." });
      }
      clauses.push("e.category_id = ?");
      params.push(categoryId);
    }

    const [rows] = await pool.query(
      `${EVENT_SELECT}
       WHERE ${clauses.join(" AND ")}
       ORDER BY e.event_date ASC, e.start_time ASC`,
      params
    );

    res.json(rows.map((row) => toPublicEvent(row)));
  } catch (err) {
    console.error("GET /api/events/search", err);
    res.status(500).json({ error: "Unable to search events." });
  }
});

/**
 * Responds with the full details of one public event.
 *
 * Unlike the list endpoints this includes "fullDescription", because the detail
 * page is the only consumer that needs it. Suspended events are treated as if
 * they do not exist, so their ids also return 404 rather than leaking that the
 * record is present but hidden.
 *
 * @param {import("express").Request} req - Reads the positive integer id from the
 *   "id" path parameter.
 * @param {import("express").Response} res - Sends the event detail object, 400 when
 *   the id is not a positive integer, 404 when the event is unknown or suspended,
 *   or 500 when the query fails.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */

// ---------- Assessment 3: registration and administrator APIs ----------

function validPositiveId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validateEventBody(body) {
  const requiredText = [
    "name", "purpose", "shortDescription", "fullDescription",
    "eventDate", "startTime", "endTime", "imageUrl"
  ];
  for (const key of requiredText) {
    if (typeof body[key] !== "string" || !body[key].trim()) {
      return `${key} is required.`;
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)) {
    return "eventDate must use YYYY-MM-DD format.";
  }
  // Parse in UTC so the check is timezone-independent (local parsing shifted
  // the date backwards for UTC+ zones and rejected every valid date).
  const date = new Date(`${body.eventDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body.eventDate) {
    return "eventDate must be a real calendar date.";
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.startTime) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(body.endTime) ||
      body.endTime <= body.startTime) {
    return "Valid startTime and endTime are required; endTime must be later.";
  }
  for (const key of ["categoryId", "locationId", "organisationId"]) {
    if (!validPositiveId(body[key])) return `${key} must be a positive integer.`;
  }
  for (const key of ["ticketPrice", "fundraisingGoal", "fundsRaised"]) {
    if (body[key] === undefined || !Number.isFinite(Number(body[key])) || Number(body[key]) < 0) {
      return `${key} must be a non-negative number.`;
    }
  }
  if (Number(body.fundraisingGoal) <= 0) return "fundraisingGoal must be greater than zero.";
  if (![0, 1, false, true, "0", "1"].includes(body.isSuspended ?? 0)) {
    return "isSuspended must be 0 or 1.";
  }
  return null;
}

function eventValues(body) {
  return [
    Number(body.organisationId), Number(body.categoryId), Number(body.locationId),
    body.name.trim(), body.purpose.trim(), body.shortDescription.trim(),
    body.fullDescription.trim(), body.eventDate, body.startTime, body.endTime,
    Number(body.ticketPrice), Number(body.fundraisingGoal), Number(body.fundsRaised || 0),
    Number(body.isSuspended || 0), body.imageUrl.trim()
  ];
}

// Admin-only list: includes upcoming, past and suspended records.
app.get("/api/admin/events", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `${EVENT_SELECT} ORDER BY e.event_date DESC, e.event_id DESC`
    );
    const events = rows.map((row) => ({
      ...toPublicEvent(row, { includeFull: true }),
      organisationId: row.organisation_id,
      categoryId: row.category_id,
      locationId: row.location_id,
      isSuspended: Number(row.is_suspended) === 1
    }));
    res.json(events);
  } catch (err) {
    console.error("GET /api/admin/events", err);
    res.status(500).json({ error: "Unable to load admin event list." });
  }
});

app.get("/api/locations", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT location_id, venue_name, suburb, city, address, latitude, longitude FROM locations ORDER BY venue_name"
    );
    res.json(rows.map((row) => ({
      locationId: row.location_id, venueName: row.venue_name,
      suburb: row.suburb, city: row.city, address: row.address,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null
    })));
  } catch (err) {
    console.error("GET /api/locations", err);
    res.status(500).json({ error: "Unable to load locations." });
  }
});

// Registration records for one event, newest first. Also used by the admin editor.
app.get("/api/events/:id/registrations", async (req, res) => {
  const eventId = validPositiveId(req.params.id);
  if (!eventId) return res.status(400).json({ error: "Event id is not valid." });
  try {
    const [rows] = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone, tickets, created_at
       FROM registrations WHERE event_id = ?
       ORDER BY created_at DESC, registration_id DESC`,
      [eventId]
    );
    res.json(rows.map((row) => ({
      registrationId: row.registration_id, eventId: row.event_id,
      fullName: row.full_name, email: row.email, phone: row.phone,
      tickets: row.tickets, registeredAt: row.created_at
    })));
  } catch (err) {
    console.error("GET event registrations", err);
    res.status(500).json({ error: "Unable to load registrations." });
  }
});

// Create a registration. The database unique key prevents one email registering
// for the same event more than once.
app.post("/api/events/:id/registrations", async (req, res) => {
  const eventId = validPositiveId(req.params.id);
  if (!eventId) return res.status(400).json({ error: "Event id is not valid." });
  const { fullName, email, phone, tickets } = req.body || {};
  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
    return res.status(400).json({ error: "Please enter your full name (2–120 characters)." });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 120) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (typeof phone !== "string" || phone.trim().length < 5 || phone.trim().length > 40) {
    return res.status(400).json({ error: "Please enter a valid contact phone number." });
  }
  const ticketCount = Number(tickets);
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 10) {
    return res.status(400).json({ error: "Tickets must be a whole number from 1 to 10." });
  }
  try {
    const [eventRows] = await pool.query(
      "SELECT event_id, event_date, is_suspended FROM events WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    if (!eventRows.length || Number(eventRows[0].is_suspended) === 1) {
      return res.status(404).json({ error: "That event is not available for registration." });
    }
    if (eventRows[0].event_date < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: "Registration is closed for past events." });
    }
    const [result] = await pool.query(
      `INSERT INTO registrations (event_id, full_name, email, phone, tickets)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, fullName.trim(), email.trim().toLowerCase(), phone.trim(), ticketCount]
    );
    res.status(201).json({
      message: "Registration completed successfully.",
      registrationId: result.insertId,
      eventId, fullName: fullName.trim(), tickets: ticketCount
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This email address has already registered for this event." });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({ error: "The selected event does not exist." });
    }
    console.error("POST event registration", err);
    res.status(500).json({ error: "Unable to complete registration." });
  }
});

// Category maintenance for the administrator.
app.post("/api/categories", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!name || name.length > 80 || !description || description.length > 255) {
    return res.status(400).json({ error: "Category name (1–80 characters) and description (1–255 characters) are required." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO categories (name, description) VALUES (?, ?)", [name, description]
    );
    res.status(201).json({ message: "Category created successfully.", categoryId: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with this name already exists." });
    console.error("POST /api/categories", err);
    res.status(500).json({ error: "Unable to create category." });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  const categoryId = validPositiveId(req.params.id);
  if (!categoryId) return res.status(400).json({ error: "Category id is not valid." });
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!name || name.length > 80 || !description || description.length > 255) {
    return res.status(400).json({ error: "Category name (1–80 characters) and description (1–255 characters) are required." });
  }
  try {
    const [result] = await pool.query(
      "UPDATE categories SET name = ?, description = ? WHERE category_id = ?",
      [name, description, categoryId]
    );
    if (!result.affectedRows) {
      const [rows] = await pool.query("SELECT category_id FROM categories WHERE category_id = ?", [categoryId]);
      if (!rows.length) return res.status(404).json({ error: "Category not found." });
    }
    res.json({ message: "Category updated successfully." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with this name already exists." });
    console.error("PUT /api/categories/:id", err);
    res.status(500).json({ error: "Unable to update category." });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  const categoryId = validPositiveId(req.params.id);
  if (!categoryId) return res.status(400).json({ error: "Category id is not valid." });
  try {
    const [rows] = await pool.query("SELECT category_id FROM categories WHERE category_id = ?", [categoryId]);
    if (!rows.length) return res.status(404).json({ error: "Category not found." });
    const [usage] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE category_id = ?", [categoryId]);
    if (Number(usage[0].total) > 0) {
      return res.status(409).json({ error: "This category is used by existing events and cannot be deleted." });
    }
    await pool.query("DELETE FROM categories WHERE category_id = ?", [categoryId]);
    res.json({ message: "Category deleted successfully." });
  } catch (err) {
    console.error("DELETE /api/categories/:id", err);
    res.status(500).json({ error: "Unable to delete category." });
  }
});

// Create event.
app.post("/api/events", async (req, res) => {
  const error = validateEventBody(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const [result] = await pool.query(
      `INSERT INTO events
       (organisation_id, category_id, location_id, name, purpose, short_description,
        full_description, event_date, start_time, end_time, ticket_price,
        fundraising_goal, funds_raised, is_suspended, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      eventValues(req.body)
    );
    res.status(201).json({ message: "Event created successfully.", eventId: result.insertId });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Select an existing category, location and organisation." });
    }
    console.error("POST /api/events", err);
    res.status(500).json({ error: "Unable to create event." });
  }
});

// Update event details by ID.
app.put("/api/events/:id", async (req, res) => {
  const eventId = validPositiveId(req.params.id);
  if (!eventId) return res.status(400).json({ error: "Event id is not valid." });
  const error = validateEventBody(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const [result] = await pool.query(
      `UPDATE events SET organisation_id = ?, category_id = ?, location_id = ?,
       name = ?, purpose = ?, short_description = ?, full_description = ?,
       event_date = ?, start_time = ?, end_time = ?, ticket_price = ?,
       fundraising_goal = ?, funds_raised = ?, is_suspended = ?, image_url = ?
       WHERE event_id = ?`,
      [...eventValues(req.body), eventId]
    );
    if (!result.affectedRows) {
      const [exists] = await pool.query("SELECT event_id FROM events WHERE event_id = ?", [eventId]);
      if (!exists.length) return res.status(404).json({ error: "Event not found." });
    }
    res.json({ message: "Event updated successfully.", eventId });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Select an existing category, location and organisation." });
    }
    console.error("PUT /api/events/:id", err);
    res.status(500).json({ error: "Unable to update event." });
  }
});

// Delete is blocked when any registrations exist.
app.delete("/api/events/:id", async (req, res) => {
  const eventId = validPositiveId(req.params.id);
  if (!eventId) return res.status(400).json({ error: "Event id is not valid." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [events] = await connection.query(
      "SELECT event_id FROM events WHERE event_id = ? FOR UPDATE", [eventId]
    );
    if (!events.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Event not found." });
    }
    const [registrations] = await connection.query(
      "SELECT COUNT(*) AS total FROM registrations WHERE event_id = ?", [eventId]
    );
    if (Number(registrations[0].total) > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: "This event cannot be deleted because it has registrations. Suspend it instead."
      });
    }
    await connection.query("DELETE FROM events WHERE event_id = ?", [eventId]);
    await connection.commit();
    res.json({ message: "Event deleted successfully." });
  } catch (err) {
    await connection.rollback();
    console.error("DELETE /api/events/:id", err);
    res.status(500).json({ error: "Unable to delete event." });
  } finally {
    connection.release();
  }
});


app.get("/api/events/:id", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId < 1) {
      return res.status(400).json({ error: "Event id is not valid." });
    }

    const [rows] = await pool.query(
      `${EVENT_SELECT}
       WHERE e.event_id = ?
         AND e.is_suspended = 0
       LIMIT 1`,
      [eventId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "That event is not available." });
    }

    const event = toPublicEvent(rows[0], { includeFull: true });
    const [registrationRows] = await pool.query(
      `SELECT registration_id, full_name, tickets, created_at
       FROM registrations WHERE event_id = ?
       ORDER BY created_at DESC, registration_id DESC`,
      [eventId]
    );
    event.registrations = registrationRows.map((registration) => ({
      registrationId: registration.registration_id,
      fullName: registration.full_name,
      tickets: registration.tickets,
      registeredAt: registration.created_at
    }));
    res.json(event);
  } catch (err) {
    console.error("GET /api/events/:id", err);
    res.status(500).json({ error: "Unable to load event details." });
  }
});

/**
 * Returns a JSON 404 for unmatched API paths, and passes everything else through.
 *
 * Without this guard an unknown "/api/..." path would fall through to the static
 * file handler and return an HTML 404, which would break clients expecting JSON.
 *
 * @param {import("express").Request} req - Inspected for the "/api/" prefix.
 * @param {import("express").Response} res - Sends the JSON error for API paths.
 * @param {import("express").NextFunction} next - Continues the middleware chain
 *   for non-API paths.
 * @returns {void}
 */
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }
  next();
});

/**
 * Verifies the database is reachable, then starts the HTTP server.
 *
 * The connection is tested before listening so a misconfigured .env fails loudly
 * at start-up instead of surfacing as a 500 on the first request. The process
 * exits with code 1 when the probe fails.
 *
 * @returns {Promise<void>} Resolves once the server is listening; the process
 *   exits instead of resolving when the database cannot be reached.
 */
async function start() {
  // Surface the password state before connecting so "Access denied" is not a black-box error.
  if (!process.env.DB_PASSWORD && process.env.DB_PASSWORD !== "") {
    // 未配置 .env 文件时 dotenv 不会加载变量，process.env.DB_PASSWORD 为 undefined
    console.warn(
      "⚠️  .env file not loaded. Copy .env.example to .env and configure DB_PASSWORD."
    );
  } else if (process.env.DB_PASSWORD === "") {
    console.warn(
      "⚠️  DB_PASSWORD is empty in .env. This will only work if your MySQL root user has no password."
    );
  }

  try {
    await testConnection();
    console.log("Connected to MySQL database", process.env.DB_NAME || "charityevents_db");
  } catch (err) {
    console.error("MySQL connection failed.");
    console.error("  1. Make sure MySQL server is running");
    console.error("  2. Import database/charityevents_db.sql (MySQL Workbench > Server > Data Import)");
    console.error("  3. Check DB_USER and DB_PASSWORD in .env");
    console.error("  Original error:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Harbour Hope API and site running at http://localhost:${PORT}`);
  });
}

start();
