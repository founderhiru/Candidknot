import { describe, expect, it } from 'vitest';
import { normalizeIndianPhone } from '@/lib/phone';

describe('normalizeIndianPhone', () => {
  it('turns natural input into the +91 E.164 form the server requires', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('(98765) 43210')).toBe('+919876543210');
  });

  it('leaves anything else stripped of formatting for the server to reject', () => {
    expect(normalizeIndianPhone('+1 415 555 0123')).toBe('+14155550123');
    expect(normalizeIndianPhone('12345')).toBe('12345');
    // 10 digits starting 1-5 are not Indian mobile numbers.
    expect(normalizeIndianPhone('1234567890')).toBe('1234567890');
  });
});
