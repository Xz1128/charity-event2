import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AdminEvent,
  Category,
  CategoryPayload,
  EventPayload,
  Location,
  Registration
} from '../models/admin';

/**
 * Wraps every administrator endpoint of the Harbour Hope REST API.
 *
 * The same error-handling pattern as the client DataService is used: a failed
 * request becomes an Error carrying the backend's message so components can
 * surface it directly in a notice banner.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getAdminEvents(): Observable<AdminEvent[]> {
    return this.http.get<AdminEvent[]>(`${this.baseUrl}/admin/events`).pipe(catchError(this.handleError));
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`).pipe(catchError(this.handleError));
  }

  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.baseUrl}/locations`).pipe(catchError(this.handleError));
  }

  getRegistrations(eventId: number): Observable<Registration[]> {
    return this.http
      .get<Registration[]>(`${this.baseUrl}/events/${eventId}/registrations`)
      .pipe(catchError(this.handleError));
  }

  createEvent(payload: EventPayload): Observable<{ message: string; eventId: number }> {
    return this.http.post<{ message: string; eventId: number }>(`${this.baseUrl}/events`, payload).pipe(catchError(this.handleError));
  }

  updateEvent(id: number, payload: EventPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/events/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteEvent(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/events/${id}`).pipe(catchError(this.handleError));
  }

  createCategory(payload: CategoryPayload): Observable<{ message: string; categoryId: number }> {
    return this.http
      .post<{ message: string; categoryId: number }>(`${this.baseUrl}/categories`, payload)
      .pipe(catchError(this.handleError));
  }

  updateCategory(id: number, payload: CategoryPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/categories/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/categories/${id}`).pipe(catchError(this.handleError));
  }

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
