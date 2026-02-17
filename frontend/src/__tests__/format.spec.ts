import { describe, it, expect } from 'vitest';
import { formatDate, formatPrice } from '../utils/format';

describe('Format Utilities', () => {
  describe('formatDate', () => {
    it('should format ISO date strings in Irish format', () => {
      expect(formatDate('2026-01-01')).toBe('01/01/2026');
    });

    it('should handle different date formats in Irish format', () => {
      expect(formatDate('2026-12-31')).toBe('31/12/2026');
    });
  });

  describe('formatPrice', () => {
    it('should format cents to currency with Euro symbol', () => {
      const result = formatPrice(1999);
      expect(result).toContain('19.99');
      expect(result).toContain('€');
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
