import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminEvent, Category, Location, Registration } from '../../models/admin';
import { formatDate, formatMoney, formatTimestamp } from '../../utils/format';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  events: AdminEvent[] = [];
  categories: Category[] = [];
  locations: Location[] = [];

  eventsLoading = true;
  categoriesLoading = true;

  notice = '';
  noticeType: 'info' | 'error' = 'info';

  // Event editor state
  eventForm: FormGroup;
  editingEventId: number | null = null;
  savingEvent = false;
  editorRegistrations: Registration[] = [];
  registrationsLoading = false;

  // Category editor state
  categoryForm: FormGroup;
  editingCategoryId: number | null = null;
  savingCategory = false;

  formatDate = formatDate;
  formatMoney = formatMoney;
  formatTimestamp = formatTimestamp;

  constructor(private api: AdminApiService, private fb: FormBuilder) {
    this.eventForm = this.fb.group({
      organisationId: [1, Validators.required],
      name: ['', [Validators.required, Validators.maxLength(160)]],
      purpose: ['', [Validators.required, Validators.maxLength(255)]],
      shortDescription: ['', [Validators.required, Validators.maxLength(280)]],
      fullDescription: ['', Validators.required],
      eventDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      categoryId: ['', Validators.required],
      locationId: ['', Validators.required],
      ticketPrice: [0, [Validators.required, Validators.min(0)]],
      fundraisingGoal: [1000, [Validators.required, Validators.min(0.01)]],
      fundsRaised: [0, [Validators.required, Validators.min(0)]],
      imageUrl: ['/images/event-1.jpg', [Validators.required, Validators.maxLength(400)]],
      isSuspended: [false]
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.loadOptions();
    this.loadEvents();
  }

  private loadOptions(): void {
    this.api.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: (err: Error) => {
        this.categoriesLoading = false;
        this.showNotice(err.message || 'Could not load categories.', 'error');
      }
    });
    this.api.getLocations().subscribe({
      next: (locations) => (this.locations = locations),
      error: (err: Error) => this.showNotice(err.message || 'Could not load locations.', 'error')
    });
  }

  private loadEvents(): void {
    this.eventsLoading = true;
    this.api.getAdminEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.eventsLoading = false;
      },
      error: (err: Error) => {
        this.eventsLoading = false;
        this.showNotice(err.message || 'Could not load events.', 'error');
      }
    });
  }

  // ---- Event editor ----

  newEvent(): void {
    this.resetEventForm();
    this.scrollToEditor();
  }

  editEvent(eventId: number): void {
    const event = this.events.find((e) => e.eventId === eventId);
    if (!event) return;

    this.editingEventId = event.eventId;
    this.eventForm.patchValue({
      organisationId: event.organisationId,
      name: event.name,
      purpose: event.purpose,
      shortDescription: event.shortDescription,
      fullDescription: event.fullDescription,
      eventDate: String(event.eventDate).slice(0, 10),
      startTime: String(event.startTime).slice(0, 5),
      endTime: String(event.endTime).slice(0, 5),
      categoryId: event.categoryId,
      locationId: event.locationId,
      ticketPrice: event.ticketPrice,
      fundraisingGoal: event.fundraisingGoal,
      fundsRaised: event.fundsRaised,
      imageUrl: event.imageUrl,
      isSuspended: event.isSuspended
    });
    this.loadEditorRegistrations(event.eventId);
    this.scrollToEditor();
  }

  private loadEditorRegistrations(eventId: number): void {
    this.registrationsLoading = true;
    this.editorRegistrations = [];
    this.api.getRegistrations(eventId).subscribe({
      next: (registrations) => {
        this.editorRegistrations = registrations;
        this.registrationsLoading = false;
      },
      error: (err: Error) => {
        this.registrationsLoading = false;
        this.showNotice(err.message || 'Could not load registrations.', 'error');
      }
    });
  }

  saveEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.showNotice('Please fill in every required field correctly.', 'error');
      return;
    }

    const raw = this.eventForm.value;
    if (raw.endTime <= raw.startTime) {
      this.showNotice('End time must be later than start time.', 'error');
      return;
    }

    const payload = {
      organisationId: Number(raw.organisationId),
      categoryId: Number(raw.categoryId),
      locationId: Number(raw.locationId),
      name: raw.name.trim(),
      purpose: raw.purpose.trim(),
      shortDescription: raw.shortDescription.trim(),
      fullDescription: raw.fullDescription.trim(),
      eventDate: raw.eventDate,
      startTime: raw.startTime,
      endTime: raw.endTime,
      ticketPrice: Number(raw.ticketPrice),
      fundraisingGoal: Number(raw.fundraisingGoal),
      fundsRaised: Number(raw.fundsRaised),
      imageUrl: raw.imageUrl.trim(),
      isSuspended: raw.isSuspended ? 1 : 0
    };

    this.savingEvent = true;
    const request = this.editingEventId
      ? this.api.updateEvent(this.editingEventId, payload)
      : this.api.createEvent(payload);

    request.subscribe({
      next: (result) => {
        this.savingEvent = false;
        this.showNotice(result.message || 'Event saved successfully.');
        this.resetEventForm();
        this.loadEvents();
      },
      error: (err: Error) => {
        this.savingEvent = false;
        this.showNotice(err.message || 'Unable to save event.', 'error');
      }
    });
  }

  deleteEvent(eventId: number): void {
    const event = this.events.find((e) => e.eventId === eventId);
    if (!event) return;
    if (!confirm(`Delete "${event.name}"? Events with registrations cannot be deleted.`)) return;

    this.api.deleteEvent(eventId).subscribe({
      next: (result) => {
        this.showNotice(result.message || 'Event deleted.');
        if (this.editingEventId === eventId) this.resetEventForm();
        this.loadEvents();
      },
      error: (err: Error) => this.showNotice(err.message || 'Could not delete event.', 'error')
    });
  }

  resetEventForm(): void {
    this.editingEventId = null;
    this.editorRegistrations = [];
    this.eventForm.reset({
      organisationId: 1,
      ticketPrice: 0,
      fundraisingGoal: 1000,
      fundsRaised: 0,
      imageUrl: '/images/event-1.jpg',
      isSuspended: false
    });
  }

  // ---- Category editor ----

  editCategory(categoryId: number): void {
    const category = this.categories.find((c) => c.categoryId === categoryId);
    if (!category) return;
    this.editingCategoryId = category.categoryId;
    this.categoryForm.patchValue({ name: category.name, description: category.description });
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.showNotice('Please enter both a category name and description.', 'error');
      return;
    }
    const payload = {
      name: this.categoryForm.value.name.trim(),
      description: this.categoryForm.value.description.trim()
    };

    this.savingCategory = true;
    const request = this.editingCategoryId
      ? this.api.updateCategory(this.editingCategoryId, payload)
      : this.api.createCategory(payload);

    request.subscribe({
      next: (result) => {
        this.savingCategory = false;
        this.showNotice(result.message || 'Category saved.');
        this.clearCategoryForm();
        this.api.getCategories().subscribe({
          next: (categories) => (this.categories = categories)
        });
      },
      error: (err: Error) => {
        this.savingCategory = false;
        this.showNotice(err.message || 'Category could not be saved.', 'error');
      }
    });
  }

  deleteCategory(categoryId: number): void {
    const category = this.categories.find((c) => c.categoryId === categoryId);
    if (!category) return;
    if (!confirm(`Delete category "${category.name}"? Categories used by events cannot be deleted.`)) return;

    this.api.deleteCategory(categoryId).subscribe({
      next: (result) => {
        this.showNotice(result.message || 'Category deleted.');
        if (this.editingCategoryId === categoryId) this.clearCategoryForm();
        this.api.getCategories().subscribe({
          next: (categories) => (this.categories = categories)
        });
      },
      error: (err: Error) => this.showNotice(err.message || 'Category could not be deleted.', 'error')
    });
  }

  clearCategoryForm(): void {
    this.editingCategoryId = null;
    this.categoryForm.reset();
  }

  // ---- Shared ----

  showNotice(text: string, type: 'info' | 'error' = 'info'): void {
    this.notice = text;
    this.noticeType = type;
  }

  statusLabel(event: AdminEvent): string {
    if (event.isSuspended) return 'Suspended';
    return event.status === 'past' ? 'Past' : 'Upcoming';
  }

  /** Formats an event's DATE (or datetime) column for display in the list. */
  eventDateLabel(event: AdminEvent): string {
    return formatDate(String(event.eventDate).slice(0, 10));
  }

  private scrollToEditor(): void {
    requestAnimationFrame(() => {
      document.getElementById('event-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
