# Harbour Hope Charity Events

PROG2002 Web Development II — Assessment 3.

A 3-tier charity event platform: **MySQL** (`charityevents_db`) → **Node.js / Express REST APIs** → **two Angular 18 websites** (public client + staff admin). Built to the MEAN-style architecture used in the course.

Fictional organisation: **Harbour Hope Foundation** (Gold Coast). Not affiliated with any real charity.

## What you get

| Area | Location |
| --- | --- |
| Database schema + seed data | `database/charityevents_db.sql` |
| Connection pool | `event_db.js` |
| REST API + static hosting | `server.js` |
| Public website (Angular) | `charity-client/` |
| Admin dashboard (Angular) | `charity-admin/` |
| Event images | bundled into each Angular `public/images/` |
| Report | `docs/Project-Report.md` |
| API reference | `docs/API.md` |
| Demo video guide | `docs/VIDEO_SCRIPT.md` |

## Architecture

```
Browser ──► Angular (charity-client @ /, charity-admin @ /admin/)
               │  HTTP JSON
               ▼
         Express REST API (server.js)
               │  parameterised SQL
               ▼
         MySQL 8 (charityevents_db)
```

- The **public site** is served from `/` and lets visitors browse, search, view
  event details (with a live weather panel), and register for events.
- The **admin site** is served from `/admin/` and provides full event and category
  management (create / read / update / delete, with safe-delete rules).
- Both Angular apps use hash-based routing, so no server-side rewrite rule is
  needed — every route loads the same single-page shell.
- The REST API is versioned under `/api` and used by both websites.

## Quick start

### 1. Prerequisites

- **Node.js 18+**
- **MySQL 8** (service running)
- **Angular CLI 18** (only needed if you rebuild the front ends)

### 2. Database

Import `database/charityevents_db.sql` (creates `charityevents_db`, 5 tables,
11 sample events, 7 venues with coordinates, and 10 registrations):

```bash
mysql -u root -p < database/charityevents_db.sql
```

Or in MySQL Workbench: **File > Run SQL Script**.

### 3. Configure

Copy `.env.example` to `.env` and set `DB_PASSWORD` to your MySQL root password.

### 4. Install and build

```bash
# Back end
npm install

# Front ends (each Angular app has its own node_modules)
cd charity-client && npm install && npm run build
cd ../charity-admin && npm install && npm run build
cd ..
```

> **Windows note:** if `ng build` reports `Cannot find module
> @rollup/rollup-win32-x64-msvc`, install the native binary explicitly:
> `npm i --no-save @rollup/rollup-win32-x64-msvc@4.22.4` (match the rollup version
> in `node_modules/rollup/package.json`), then rebuild.

### 5. Run

```bash
npm start
```

Open:

- Public site: <http://localhost:3000/>
- Admin dashboard: <http://localhost:3000/admin/>

## REST API

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/organisation` | Charity profile (home + contact) |
| GET | `/api/categories` | Category list |
| GET | `/api/locations` | Venue list (with latitude / longitude) |
| GET | `/api/events` | Current + upcoming, not suspended |
| GET | `/api/events/search?date=&location=&categoryId=` | Filtered active events |
| GET | `/api/events/:id` | Full detail + registrations |
| GET | `/api/events/:id/registrations` | Registrations for one event |
| POST | `/api/events/:id/registrations` | Create a registration |
| GET | `/api/admin/events` | All events (incl. past + suspended) |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event (blocked if it has registrations) |
| POST / PUT / DELETE | `/api/categories[/:id]` | Category management |

Suspended events are omitted from every public endpoint (detail returns 404).

## Pages (Angular routes)

**Public client** (`charity-client`, hash routes):

- `/#/` — organisation story + upcoming event cards
- `/#/search` — date / location / category filters
- `/#/event/:id` — details, goal progress, weather, recent registrations
- `/#/register/:id` — registration form
- `/#/contact` — contact details + message form

**Admin** (`charity-admin`, `/admin/`):

- `/admin/` — event list + editor + category management

## Weather integration

Event detail pages show a 7-day forecast pulled from the free
[Open-Meteo](https://open-meteo.com) API (no key required). Each venue's
latitude/longitude is stored on the `locations` table; events at venues without
coordinates simply omit the panel. The Content-Security-Policy allows the
`connect-src https://api.open-meteo.com` origin.

## Security

- All SQL uses bound parameters (`?` placeholders) — no string concatenation.
- Suspended events are hidden at the data layer, not just in the UI.
- Response headers close common classes of attack (nosniff, frame denial, CSP).
- Angular escapes interpolated text by default, preventing stored-XSS.

## GitHub

This folder is a git repository. Create a **private** GitHub repo, invite your
marker as a collaborator, and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/charity-events.git
git push -u origin main
```

Do not make the repository public (other students must not copy it).
