import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { WeatherService, EventForecast } from '../../services/weather.service';
import { Event } from '../../models/event';
import { formatDate, formatMoney, formatRegistrationDate, formatTime } from '../../utils/format';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnInit {
  event: Event | null = null;
  loading = true;
  error = '';
  forecast: EventForecast | null = null;

  formatDate = formatDate;
  formatMoney = formatMoney;
  formatTime = formatTime;
  formatRegistrationDate = formatRegistrationDate;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private weather: WeatherService,
    private title: Title
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error = 'No event was selected. Return to Home or Search and choose an event.';
      this.loading = false;
      return;
    }

    this.api.getEvent(id).subscribe({
      next: (event) => {
        this.event = event;
        this.loading = false;
        this.title.setTitle(`${event.name} · Harbour Hope`);
        this.loadForecast(event);
      },
      error: (err: Error) => {
        this.error = err.message || 'This event could not be loaded.';
        this.loading = false;
      }
    });
  }

  get ticketLabel(): string {
    return this.event?.isFree ? 'Free admission' : formatMoney(this.event?.ticketPrice ?? 0);
  }

  get whenLabel(): string {
    if (!this.event) return '';
    return `${formatDate(this.event.eventDate)} · ${formatTime(this.event.startTime)} – ${formatTime(this.event.endTime)}`;
  }

  get whereLabel(): string {
    if (!this.event) return '';
    return `${this.event.location.venueName}, ${this.event.location.address}`;
  }

  /** Weather is optional; a missing coordinate simply hides the panel. */
  private loadForecast(event: Event): void {
    this.weather.getForecast(event.location.latitude, event.location.longitude).subscribe({
      next: (forecast) => (this.forecast = forecast)
    });
  }

  describeWeather = (code: number) => this.weather.describeWeather(code);

  weekday(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short' });
  }
}
