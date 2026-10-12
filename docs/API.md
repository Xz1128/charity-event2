# Harbour Hope API — Assessment 3

The Node.js/Express server serves the client website and JSON API from the same origin.

## Public read APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/organisation` | Organisation profile |
| GET | `/api/categories` | Categories for search and registration/admin forms |
| GET | `/api/locations` | Venues for admin event forms |
| GET | `/api/events` | Upcoming, non-suspended events |
| GET | `/api/events/search?date=YYYY-MM-DD&location=...&categoryId=...` | Search events using one or more filters |
| GET | `/api/events/:id` | Event details and registrations (newest first) |
| GET | `/api/events/:id/registrations` | Registration details for an event; used by admin |

## Registration API

`POST /api/events/:id/registrations`

JSON body:
```json
{
  "fullName": "Taylor Example",
  "email": "taylor@example.com",
  "phone": "0400 123 456",
  "tickets": 2
}
```

The API validates all fields, checks that the event exists and is open for registration, and returns `201` on success. An email can register for a particular event only once; a duplicate returns `409`.

## Administrator event APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/events` | All events, including past and suspended |
| POST | `/api/events` | Create an event |
| PUT | `/api/events/:id` | Update an event |
| DELETE | `/api/events/:id` | Delete only when no registrations exist |

Event JSON fields: `organisationId`, `categoryId`, `locationId`, `name`, `purpose`, `shortDescription`, `fullDescription`, `eventDate`, `startTime`, `endTime`, `ticketPrice`, `fundraisingGoal`, `fundsRaised`, `isSuspended`, and `imageUrl`.

## Administrator category APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Delete a category only when no event uses it |

## Error handling

Errors return JSON in the form `{"error":"Helpful message"}`. Common status codes include `400` for invalid input, `404` for a missing event/category, `409` for duplicate registration or blocked deletion, and `500` for unexpected server/database failures.

## Local setup

1. Import `database/charityevents_db.sql` into MySQL. It creates the database, tables, sample events, 7 venues (with latitude/longitude for weather), and 10 sample registrations.
2. Copy `.env.example` to `.env` and set your local MySQL credentials.
3. Run `npm install` if dependencies are not installed.
4. Build both Angular apps (`charity-client` and `charity-admin`) with `npm run build` in each.
5. Run `npm start` from the project root.
6. Open `http://localhost:3000/` for the public site or `http://localhost:3000/admin/` for the admin dashboard.

## Weather

The `/api/locations` endpoint and every event's `location` object include `latitude`
and `longitude` (or `null`). The Angular client uses these to call the free
[Open-Meteo](https://open-meteo.com) forecast API directly from the browser and
render a 7-day weather panel on the event detail page.
