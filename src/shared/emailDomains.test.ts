import { describe, expect, it } from 'vitest';
import {
  guessCompanyNameFromDomain,
  isAutomatedEmail,
  isPersonalEmailDomain,
  normalizeDomain,
  splitFullName,
} from './emailDomains';

describe('emailDomains', () => {
  it('normalizes company domains from any link format', () => {
    expect(normalizeDomain('https://www.Attio.com/')).toBe('attio.com');
    expect(normalizeDomain('helpscout.com')).toBe('helpscout.com');
    expect(normalizeDomain('')).toBeNull();
  });

  it('flags personal and automated addresses', () => {
    expect(isPersonalEmailDomain('gmail.com')).toBe(true);
    expect(isPersonalEmailDomain('attio.com')).toBe(false);
    expect(isAutomatedEmail('noreply@x.com')).toBe(true);
    expect(isAutomatedEmail('julian@x.com')).toBe(false);
  });

  it('guesses names', () => {
    expect(guessCompanyNameFromDomain('helpscout.com')).toBe('Helpscout');
    expect(guessCompanyNameFromDomain('mail.acme.co.uk')).toBe('Acme');
    expect(splitFullName('Julian Herbst', 'julian@attio.com')).toEqual({
      firstName: 'Julian',
      lastName: 'Herbst',
    });
    expect(splitFullName(null, 'lisa.cosme@attio.com')).toEqual({
      firstName: 'Lisa',
      lastName: 'Cosme',
    });
  });
});
