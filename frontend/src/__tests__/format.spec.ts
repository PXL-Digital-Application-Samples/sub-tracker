import { describe, it, expect } from 'vitest';
import { formatDate, formatPrice } from '../utils/format';

describe('Format Utilities', () => {
  describe('formatDate', () => {
    it('should format ISO date strings', () => {
      // locale dependent, assuming en-US in test environment
      const date = new Date('2026-01-01');
      expect(formatDate('2026-01-01')).toBe(date.toLocaleDateString());
    });

    it('should handle different date formats', () => {
      const date = new Date('2026-12-31T23:59:59Z');
      expect(formatDate('2026-12-31T23:59:59Z')).toBe(date.toLocaleDateString());
    });
  });

  describe('formatPrice', () => {
    it('should format cents to currency', () => {
      expect(formatPrice(1999)).toContain('19.99');
      expect(formatPrice(1999)).toContain('€');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toContain('0.00');
    });

    it('should handle single digits', () => {
      expect(formatPrice(5)).toContain('0.05');
    });

    it('should handle large amounts', () => {
      expect(formatPrice(123456)).toContain('1,234.56');
    });
  });
});
