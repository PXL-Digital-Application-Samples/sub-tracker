export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString();
}

export function formatPrice(cents: number, currency: string = 'EUR'): string {
  const amount = cents / 100;
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: currency,
  });
}
