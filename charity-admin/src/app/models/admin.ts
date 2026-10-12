/**
 * Domain models for the administrator dashboard.
 *
 * These mirror the client-side models but add the admin-only fields
 * (organisationId, categoryId, locationId, isSuspended) exposed by
 * /api/admin/events.
 */

export interface Category {
  categoryId: number;
  name: string;
  description: string;
}

export interface Location {
  locationId: number;
  venueName: string;
  suburb: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Registration {
  registrationId: number;
  eventId: number;
  fullName: string;
  email: string;
  phone: string;
  tickets: number;
  registeredAt: string;
}

export interface AdminEvent {
  eventId: number;
  name: string;
  purpose: string;
  shortDescription: string;
  fullDescription: string;
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
  organisationId: number;
  categoryId: number;
  locationId: number;
  isSuspended: boolean;
}

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

export interface CategoryPayload {
  name: string;
  description: string;
}
