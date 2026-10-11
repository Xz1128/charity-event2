import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Event, Organisation } from '../../models/event';
import { formatMoney } from '../../utils/format';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  organisation: Organisation | null = null;
  events: Event[] = [];
  loading = true;
  error = '';
  formatMoney = formatMoney;

  get totalRaised(): number {
    return this.events.reduce((sum, event) => sum + event.fundsRaised, 0);
  }

  get causeCount(): number {
    return new Set(this.events.map((event) => event.category.name)).size;
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadOrganisation();
    this.loadEvents();
  }

  private loadOrganisation(): void {
    this.api.getOrganisation().subscribe({
      next: (org) => (this.organisation = org),
      error: () => {
        // Keep a friendly fallback so the hero is never blank.
        this.organisation = {
          organisationId: 1,
          name: 'Harbour Hope Foundation',
          tagline: 'Local hearts. Lasting change.',
          welcomeMessage:
            'Welcome to Harbour Hope Foundation. We host charity events across the Gold Coast to fund housing, youth wellbeing, and coastal care.',
          mission:
            'Our mission is to connect local causes with people who can show up — by walking, dining, bidding, or singing — and turn ticket sales into practical help.',
          email: 'hello@harbourhope.org.au',
          phone: '(07) 5550 2140',
          address: '12 Marine Parade, Southport QLD 4215',
          city: 'Gold Coast',
          website: ''
        };
      }
    });
  }

  private loadEvents(): void {
    this.api.getEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message || 'Upcoming events could not be loaded. Please try again shortly.';
        this.loading = false;
      }
    });
  }
}
