/**
 * Domain models mirroring the JSON shape returned by the Harbour Hope REST API.
 *
 * The backend (server.js) converts snake_case database columns to camelCase, so
 * these interfaces match the wire format one-to-one. Keeping them in one file
 * gives every service and component a single source of truth for field names.
 */

/** A category an event can belong to, e.g. "Community walk". */
export interface Category {
  categoryId: number;
  name: string;
  description: string;
}

/** A physical venue where events are held. */
export interface Location {
  locationId: number;
  venueName: string;
  suburb: string;
  city: string;
  address: string;
  /** Decimal degrees, or null when the venue has no coordinates. */
  latitude: number | null;
  longitude: number | null;
}

/** The charity organisation profile shown on the home and contact pages. */
export interface Organisation {
  organisationId: number;
  name: string;
  tagline: string;
  welcomeMessage: string;
  mission: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  website: string;
}

/** A registration booking made for an event. */
export interface Registration {
  registrationId: number;
  eventId: number;
  fullName: string;
  email: string;
  phone: string;
  tickets: number;
  registeredAt: string;
}

/**
 * An event summary. The list and search endpoints return this shape without the
 * long description; the detail endpoint adds `fullDescription` and `registrations`.
 */
export interface Event {
  eventId: number;
  name: string;
  purpose: string;
  shortDescription: string;
  fullDescription?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  isFree: boolean;
  fundraisingGoal: number;
  fundsRaised: number;
  progressPercent: number;
  imageUrl: string;
  registrationCount: number;
  status: 'upcoming' | 'past';
  category: Category;
  location: Location;
  organisationName: string;
  registrations?: Registration[];
}

/** The extended shape returned by /api/admin/events. */
export interface AdminEvent extends Event {
  organisationId: number;
  categoryId: number;
  locationId: number;
  isSuspended: boolean;
}

/** Payload used to create or update an event from the admin editor. */
export interface EventPayload {
  organisationId: number;
  categoryId: number;
  locationId: number;
  name: string;
  purpose: string;
  shortDescription: string;
  fullDescription: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  fundraisingGoal: number;
  fundsRaised: number;
  imageUrl: string;
  isSuspended: number;
}

/** Payload used to create or update a registration booking. */
export interface RegistrationPayload {
  fullName: string;
  email: string;
  phone: string;
  tickets: number;
}

/** Payload used to create or update a category. */
export interface CategoryPayload {
  name: string;
  description: string;
}
