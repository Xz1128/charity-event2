import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AdminEvent,
  Category,
  CategoryPayload,
  Event,
  EventPayload,
  Location,
  Organisation,
  Registration,
  RegistrationPayload
} from '../models/event';

/**
 * A single service that wraps every call to the Harbour Hope REST API.
 *
 * Following the DataService pattern used in the course, each method maps to one
 * endpoint and returns an Observable. A shared error handler extracts the
 * backend's `error` message so components can show a friendly message without
 * parsing HTTP responses themselves.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  /** The API is served from the same origin as the Angular bundle. */
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  /** Organisation profile shown on the home and contact pages. */
  getOrganisation(): Observable<Organisation> {
    return this.http.get<Organisation>(`${this.baseUrl}/organisation`).pipe(
      catchError(this.handleError)
    );
  }

  /** All event categories, ordered by name. */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`).pipe(
      catchError(this.handleError)
    );
  }

  /** All venues, used to populate the admin editor dropdown. */
  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.baseUrl}/locations`).pipe(
      catchError(this.handleError)
    );
  }

  /** Current and upcoming events for the home page. */
  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/events`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Searches events by any combination of date, location, and category.
   * Empty filters are omitted so the backend's "at least one filter" rule works.
   */
  searchEvents(filters: { date?: string; location?: string; categoryId?: string }): Observable<Event[]> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.location) params = params.set('location', filters.location);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    return this.http.get<Event[]>(`${this.baseUrl}/events/search`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Full details for one event, including its registrations. */
  getEvent(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/events/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Registrations for one event, newest first. */
  getRegistrations(eventId: number): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.baseUrl}/events/${eventId}/registrations`).pipe(
      catchError(this.handleError)
    );
  }

  /** Submits a new registration booking. */
  register(eventId: number, payload: RegistrationPayload): Observable<{ message: string; registrationId: number }> {
    return this.http
      .post<{ message: string; registrationId: number }>(
        `${this.baseUrl}/events/${eventId}/registrations`,
        payload
      )
      .pipe(catchError(this.handleError));
  }

  // ---- Administrator endpoints ----

  /** All events including past and suspended records. */
  getAdminEvents(): Observable<AdminEvent[]> {
    return this.http.get<AdminEvent[]>(`${this.baseUrl}/admin/events`).pipe(
      catchError(this.handleError)
    );
  }

  /** Creates a new event. */
  createEvent(payload: EventPayload): Observable<{ message: string; eventId: number }> {
    return this.http
      .post<{ message: string; eventId: number }>(`${this.baseUrl}/events`, payload)
      .pipe(catchError(this.handleError));
  }

  /** Updates an existing event. */
  updateEvent(id: number, payload: EventPayload): Observable<{ message: string }> {
    return this.http
      .put<{ message: string }>(`${this.baseUrl}/events/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  /** Deletes an event. The backend blocks this when registrations exist. */
  deleteEvent(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/events/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** Creates a new category. */
  createCategory(payload: CategoryPayload): Observable<{ message: string; categoryId: number }> {
    return this.http
      .post<{ message: string; categoryId: number }>(`${this.baseUrl}/categories`, payload)
      .pipe(catchError(this.handleError));
  }

  /** Updates an existing category. */
  updateCategory(id: number, payload: CategoryPayload): Observable<{ message: string }> {
    return this.http
      .put<{ message: string }>(`${this.baseUrl}/categories/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  /** Deletes a category. The backend blocks this when events still use it. */
  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/categories/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Converts a failed HTTP response into an Error carrying the backend's
   * human-readable message. The `status` is preserved for callers that need it.
   */
  private handleError(err: HttpErrorResponse) {
    const message =
      (err.error && err.error.error) ||
      (err.status === 0
        ? 'The server could not be reached. Please check your connection and try again.'
        : 'The request could not be completed.');
    const error = new Error(message) as Error & { status: number };
    error.status = err.status;
    return throwError(() => error);
  }
}
