-- ============================================================
-- Harbour Hope Foundation - charityevents_db
-- PROG2002 Web Development II - Assessment 2
-- Import this file in MySQL Workbench (File > Run SQL Script)
-- or: mysql -u root -p < database/charityevents_db.sql
-- ============================================================

DROP DATABASE IF EXISTS charityevents_db;
CREATE DATABASE charityevents_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE charityevents_db;

-- ------------------------------------------------------------
-- organisations: the charitable body that hosts events.
-- Normalised so events do not repeat org contact details.
-- ------------------------------------------------------------
CREATE TABLE organisations (
    organisation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    tagline         VARCHAR(200) NOT NULL,
    welcome_message TEXT NOT NULL,
    mission         TEXT NOT NULL,
    email           VARCHAR(120) NOT NULL,
    phone           VARCHAR(40)  NOT NULL,
    address         VARCHAR(200) NOT NULL,
    city            VARCHAR(80)  NOT NULL,
    website         VARCHAR(200) NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- categories: fun run, gala, auction, concert, etc.
-- ------------------------------------------------------------
CREATE TABLE categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- locations: venue + suburb so events can be filtered by place
-- without storing duplicated address strings.
-- ------------------------------------------------------------
CREATE TABLE locations (
    location_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venue_name  VARCHAR(120) NOT NULL,
    suburb      VARCHAR(80)  NOT NULL,
    city        VARCHAR(80)  NOT NULL,
    address     VARCHAR(200) NOT NULL,
    latitude    DECIMAL(9,6) NULL,
    longitude   DECIMAL(9,6) NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- events: fundraising activities hosted by an organisation.
-- is_suspended = 1  -> policy violation; hidden from public lists.
-- ticket_price  = 0 -> free admission (donation still welcome).
-- fundraising_goal / funds_raised support Goal vs Progress.
-- ------------------------------------------------------------
CREATE TABLE events (
    event_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organisation_id   INT UNSIGNED NOT NULL,
    category_id       INT UNSIGNED NOT NULL,
    location_id       INT UNSIGNED NOT NULL,
    name              VARCHAR(160) NOT NULL,
    purpose           VARCHAR(255) NOT NULL,
    short_description VARCHAR(280) NOT NULL,
    full_description  TEXT NOT NULL,
    event_date        DATE NOT NULL,
    start_time        TIME NOT NULL,
    end_time          TIME NOT NULL,
    ticket_price      DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    fundraising_goal  DECIMAL(12,2) NOT NULL,
    funds_raised      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_suspended      TINYINT(1) NOT NULL DEFAULT 0,
    image_url         VARCHAR(400) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_org
        FOREIGN KEY (organisation_id) REFERENCES organisations (organisation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_event_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_event_location
        FOREIGN KEY (location_id) REFERENCES locations (location_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_goal_positive CHECK (fundraising_goal > 0),
    CONSTRAINT chk_funds_nonneg CHECK (funds_raised >= 0),
    CONSTRAINT chk_price_nonneg CHECK (ticket_price >= 0),
    -- An event must end after it starts; same-day events share the date column.
    CONSTRAINT chk_event_time_order CHECK (end_time > start_time),
    INDEX idx_events_date (event_date),
    INDEX idx_events_suspended (is_suspended),
    INDEX idx_events_category (category_id)
) ENGINE=InnoDB;

-- Prepared for Assessment 3 (ticket registration). Not used by public GET APIs.
CREATE TABLE registrations (
    registration_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id        INT UNSIGNED NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(120) NOT NULL,
    phone           VARCHAR(40) NOT NULL,
    tickets         INT UNSIGNED NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reg_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    -- One registration per email address per event: a double booking under the
    -- same email is rejected by the database itself, not only by app code.
    CONSTRAINT uq_registration_per_email UNIQUE (event_id, email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed data
-- ------------------------------------------------------------
INSERT INTO organisations (
    name, tagline, welcome_message, mission, email, phone, address, city, website
) VALUES (
    'Harbour Hope Foundation',
    'Local hearts. Lasting change.',
    'Welcome to Harbour Hope - Gold Coast families raising funds for housing, youth wellbeing, and coastal conservation. Browse our upcoming events, buy a ticket, and stand with neighbours who need us.',
    'Harbour Hope Foundation is a Gold Coast not-for-profit that mobilises the community through ticketed charity events. Every dollar from a gala table, fun-run bib, or auction paddle is directed to a named local cause: emergency housing, youth mental health, food relief, and protecting the southern coastline.',
    'hello@harbourhope.org.au',
    '(07) 5550 2140',
    '12 Marine Parade, Southport QLD 4215',
    'Gold Coast',
    'https://harbourhope.example.org'
);

INSERT INTO categories (name, description) VALUES
    ('Fun Run', 'Community runs and walks that combine fitness with fundraising.'),
    ('Gala Dinner', 'Formal seated dinners with speakers, entertainment, and a pledge.'),
    ('Silent Auction', 'Bid on donated experiences and goods to raise funds.'),
    ('Concert', 'Live music nights where ticket sales support a named cause.'),
    ('Community Fair', 'Family-friendly stalls, food, and free or low-cost entry.');

INSERT INTO locations (venue_name, suburb, city, address, latitude, longitude) VALUES
    ('Broadwater Parklands', 'Southport', 'Gold Coast', 'Marine Parade, Southport QLD 4215', -27.966000, 153.410000),
    ('The Star Gold Coast', 'Broadbeach', 'Gold Coast', '1 Casino Dr, Broadbeach QLD 4218', -28.031900, 153.428800),
    ('HOTA Gallery', 'Surfers Paradise', 'Gold Coast', '135 Bundall Rd, Surfers Paradise QLD 4217', -28.001700, 153.426200),
    ('Currumbin Beachfront', 'Currumbin', 'Gold Coast', 'Pacific Parade, Currumbin QLD 4223', -28.135800, 153.487900),
    ('Southport Sharks Club', 'Southport', 'Gold Coast', '1 Marine Parade, Southport QLD 4215', -27.968000, 153.415000),
    ('Robina Community Centre', 'Robina', 'Gold Coast', '196 Robina Town Centre Dr, Robina QLD 4226', -28.076000, 153.386000),
    ('Coolangatta Hotel Ballroom', 'Coolangatta', 'Gold Coast', 'Corner Marine Pde & Warner St, Coolangatta QLD 4225', -28.168200, 153.538500);

-- event_date values are set around 27 Sep 2026 (current assignment date):
-- upcoming  >= 2026-09-27, past < 2026-09-27, one suspended (hidden from public lists).
INSERT INTO events (
    organisation_id, category_id, location_id, name, purpose, short_description,
    full_description, event_date, start_time, end_time, ticket_price,
    fundraising_goal, funds_raised, is_suspended, image_url
) VALUES
(
    1, 1, 1,
    'Sunrise Harbour 10k',
    'Emergency housing deposits for Gold Coast families',
    'A dawn 10 kilometre run along the Broadwater, finishing with breakfast and a live total.',
    'Lace up for Sunrise Harbour 10k - a fully marshalled course from Broadwater Parklands to Main Beach and back. Entry includes a race bib, medal, and a hot breakfast. Net proceeds fund bond and first-week rent for households exiting crisis accommodation. Walkers are welcome on the 5k loop. Volunteers from local surf clubs staff drink stations, and a junior 1k starts at 8:30am.',
    '2026-10-12', '06:30:00', '10:00:00', 45.00, 25000.00, 11240.00, 0,
    '/images/event-1.jpg'
),
(
    1, 2, 2,
    'Lantern Gala by the Sea',
    'Youth mental-health counselling hours',
    'Black-tie dinner, coastal menu, and a keynote from a local clinician.',
    'Lantern Gala by the Sea is Harbour Hope''s flagship dinner. Guests enjoy a three-course menu from Gold Coast producers, a silent paddle-raise, and a keynote on early-intervention counselling. Tables of ten are available; individual seats can be purchased. Dress is black tie optional. All ticket revenue after venue costs is pledged to bulk-buy counselling sessions for 12-25 year olds on the waitlist.',
    '2026-11-08', '18:30:00', '23:00:00', 185.00, 80000.00, 32600.00, 0,
    '/images/event-2.jpg'
),
(
    1, 3, 3,
    'Art for Shelter Silent Auction',
    'Winter blankets and furniture for new homes',
    'Preview local art, then bid quietly on canvases, ceramics, and weekends away.',
    'HOTA Gallery hosts Art for Shelter. More than forty Gold Coast artists have donated work. Bidding opens at midday and closes at 5pm sharp. A live board tracks the highest bid on hero lots. Complimentary tea and canapes are included. Funds purchase furniture packs for families moving from temporary stays into long-term rentals.',
    '2026-10-25', '12:00:00', '17:00:00', 20.00, 18000.00, 5400.00, 0,
    '/images/event-3.jpg'
),
(
    1, 4, 7,
    'Tides & Strings Benefit Concert',
    'Coastal dune restoration after storm damage',
    'An evening of strings, surf-rock, and a choir from local high schools.',
    'Tides & Strings fills the Coolangatta Hotel ballroom with a chamber ensemble, two Gold Coast singer-songwriters, and a combined school choir. Standing and seated tickets are available. A short film about dune fencing at Currumbin plays at interval. Ticket sales restore native plantings and volunteer sandbag stores used after east-coast lows.',
    '2026-12-05', '19:00:00', '22:00:00', 55.00, 22000.00, 4100.00, 0,
    '/images/event-4.jpg'
),
(
    1, 5, 6,
    'Robina Harvest Fair',
    'School holiday meals for food-insecure households',
    'Free family fair with produce stalls, a kids'' trail, and a gold-coin BBQ.',
    'Robina Harvest Fair is our largest family day. Entry is free; optional gold-coin BBQ plates and a raffle raise funds for school-holiday hampers. Local growers donate produce for a community stall. There is a quiet tent for neurodivergent visitors. Dogs on leads are welcome in the outer lawn only.',
    '2026-10-04', '09:00:00', '15:00:00', 0.00, 12000.00, 2750.00, 0,
    '/images/event-5.jpg'
),
(
    1, 2, 5,
    'Sharks Club Quiz for Hope',
    'After-hours youth drop-in staffing',
    'Tables of eight, themed rounds, and a raffle of surf-brand prizes.',
    'Quiz for Hope is a relaxed night at Southport Sharks. Form a table of eight or join a mixed table at the door. Rounds cover sport, Gold Coast trivia, music, and picture questions. A licensed bar operates as usual. Net ticket sales pay sessional youth workers for Friday-night drop-in over summer.',
    '2026-10-17', '18:00:00', '21:30:00', 25.00, 8000.00, 3600.00, 0,
    '/images/event-6.jpg'
),
(
    1, 1, 4,
    'Currumbin Coastal Walk',
    'Accessible beach matting at Elephant Rock',
    'A 6 kilometre social walk at low tide, with morning tea at the finish.',
    'The Currumbin Coastal Walk is paced for conversation rather than race times. Marshals mark the firm sand route. A seated rest point is provided at halfway. Morning tea is included. Funds buy roll-out matting so wheelchair users can reach the water near Elephant Rock.',
    '2026-11-22', '07:00:00', '10:30:00', 15.00, 9000.00, 1200.00, 0,
    '/images/event-7.jpg'
),
(
    1, 3, 2,
    'Paddle Raise: Experiences Auction',
    'Crisis accommodation nights this summer',
    'Bid on holidays, restaurant vouchers, and a helicopter flight donated by partners.',
    'Our experiences auction returns to The Star. Lots include a hinterland weekend, a chef''s table, and a scenic flight. Bidding is silent until the final ten minutes, when a caller closes hero lots. Cocktail attire. Ticket includes canapes. Proceeds purchase emergency motel nights for people presenting to local services after hours.',
    '2027-02-14', '18:00:00', '21:00:00', 40.00, 30000.00, 1500.00, 0,
    '/images/event-8.jpg'
),
(
    1, 4, 3,
    'Winter Voices Recital (Past)',
    'Heating subsidies for older renters',
    'A sold-out recital held in June - listed so the site can mark past events.',
    'Winter Voices was a chamber recital at HOTA in June 2026. The program raised heating subsidies. It remains in the database so the website can classify events as past when the event date is before today. Public home listing hides past events automatically.',
    '2026-06-14', '19:00:00', '21:00:00', 35.00, 10000.00, 10000.00, 0,
    '/images/event-9.jpg'
),
(
    1, 1, 1,
    'ANZAC Bridge Fun Run (Past)',
    'Veterans'' family weekend camps',
    'Completed April fun run - used to demonstrate past-event labelling.',
    'This April 2026 fun run has already taken place. Progress reached the goal. It is stored so search-by-date can still retrieve historical events, while the home page only features current and upcoming dates.',
    '2026-04-19', '06:00:00', '09:30:00', 40.00, 15000.00, 16200.00, 0,
    '/images/event-10.jpg'
),
(
    1, 5, 6,
    'Unauthorised Street Raffle (Suspended)',
    'This listing violated fundraising policy',
    'Suspended by staff - must never appear on the public home or search lists.',
    'This record exists only to prove the suspension rule. It used a public street that was never approved, and lottery permits were not lodged. is_suspended = 1 hides it from GET /api/events and search. Direct ID lookup also returns 404 for public consumers.',
    '2026-10-30', '10:00:00', '16:00:00', 5.00, 2000.00, 50.00, 1,
    '/images/event-11.jpg'
);


-- ------------------------------------------------------------
-- Assessment 3 registration sample data (10 records)
-- ------------------------------------------------------------
INSERT INTO registrations (event_id, full_name, email, phone, tickets, created_at) VALUES
(1, 'Ava Thompson', 'ava.thompson@example.com', '0400 111 101', 2, '2026-09-28 09:10:00'),
(1, 'Liam Wilson', 'liam.wilson@example.com', '0400 111 102', 1, '2026-10-01 11:25:00'),
(1, 'Mia Chen', 'mia.chen@example.com', '0400 111 103', 3, '2026-10-03 14:45:00'),
(2, 'Noah Patel', 'noah.patel@example.com', '0400 111 104', 2, '2026-09-29 10:00:00'),
(2, 'Isla Brown', 'isla.brown@example.com', '0400 111 105', 1, '2026-10-04 16:20:00'),
(3, 'Oliver Taylor', 'oliver.taylor@example.com', '0400 111 106', 2, '2026-09-30 12:15:00'),
(3, 'Amelia Martin', 'amelia.martin@example.com', '0400 111 107', 4, '2026-10-05 09:30:00'),
(4, 'Jack Lee', 'jack.lee@example.com', '0400 111 108', 2, '2026-10-02 18:05:00'),
(5, 'Grace Nguyen', 'grace.nguyen@example.com', '0400 111 109', 3, '2026-10-06 08:50:00'),
(6, 'Lucas Davis', 'lucas.davis@example.com', '0400 111 110', 1, '2026-10-07 13:40:00');
