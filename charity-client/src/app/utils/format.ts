/**
 * Pure display helpers shared across the client.
 *
 * Angular's templates already escape interpolated text, so these functions only
 * format values and never build HTML — unlike the vanilla-JS version there is
 * no need for a manual escapeHtml helper.
 */

/** Formats an ISO date (YYYY-MM-DD) as "Mon, 12 October 2026". */
export function formatDate(isoDate: string): string {
  if (!isoDate) return 'Date unavailable';
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/** Formats a number as Australian currency, e.g. "$1,250.00". */
export function formatMoney(amount: number | string): string {
  return Number(amount).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD'
  });
}

/** Formats a MySQL TIME string (HH:MM:SS) as "6:30 am". */
export function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

/** Builds an "In N days" label for upcoming events. */
export function countdownLabel(eventDate: string, status: 'upcoming' | 'past'): string {
  if (status !== 'upcoming') return '';
  const eventDay = new Date(`${eventDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Formats a registration timestamp for the detail and admin pages. */
export function formatRegistrationDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
}
