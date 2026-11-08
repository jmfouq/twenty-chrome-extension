import { describe, expect, it } from 'vitest';
import { formatTwentyPhone, toTwentyPhone } from './phone';

describe('phone', () => {
  it('parses French numbers by default and international ones as given', () => {
    expect(toTwentyPhone('06 12 34 56 78')).toEqual({
      primaryPhoneNumber: '612345678',
      primaryPhoneCallingCode: '+33',
      primaryPhoneCountryCode: 'FR',
    });
    expect(toTwentyPhone('+44 20 7946 0958').primaryPhoneCallingCode).toBe('+44');
    expect(() => toTwentyPhone('abc')).toThrow('Numéro invalide');
  });

  it('formats stored numbers', () => {
    expect(formatTwentyPhone({ primaryPhoneNumber: '612345678', primaryPhoneCallingCode: '+33' })).toBe(
      '+33 6 12 34 56 78',
    );
    expect(formatTwentyPhone({ primaryPhoneNumber: '', primaryPhoneCallingCode: '+33' })).toBeNull();
  });
});
