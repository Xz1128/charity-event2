/** Display helpers for the administrator dashboard. */

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

export function formatMoney(amount: number | string): string {
  return Number(amount).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

export function formatTimestamp(value: string | null): string {
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
