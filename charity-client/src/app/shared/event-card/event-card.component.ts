import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Event } from '../../models/event';
import { countdownLabel, formatDate, formatMoney } from '../../utils/format';

/**
 * A clickable summary card for one event, shown on the home and search pages.
 *
 * The whole card is a router link to the detail page. Because Angular escapes
 * interpolated text by default, database content is rendered safely without a
 * manual escaping step.
 */
@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.css'
})
export class EventCardComponent {
  @Input({ required: true }) event!: Event;

  formatDate = formatDate;
  formatMoney = formatMoney;

  get statusLabel(): string {
    return this.event.status === 'past' ? 'Past' : 'Upcoming';
  }

  get soonLabel(): string {
    return countdownLabel(this.event.eventDate, this.event.status);
  }
}
