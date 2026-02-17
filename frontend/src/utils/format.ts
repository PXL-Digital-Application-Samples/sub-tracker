export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-IE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatPrice(cents: number, currency: string = 'EUR'): string {
  const amount = cents / 100;
  return amount.toLocaleString('en-IE', {
    style: 'currency',
    currency: currency,
  });
}
