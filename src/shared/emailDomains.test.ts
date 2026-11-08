import { describe, expect, it } from 'vitest';
import {
  getRegistrableDomain,
  guessCompanyNameFromDomain,
  guessCompanyNameFromPage,
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

  it('reduces a website host to the company domain', () => {
    expect(getRegistrableDomain('app.eu.agicap.com')).toBe('agicap.com');
    expect(getRegistrableDomain('www.shop.acme.co.uk')).toBe('acme.co.uk');
  });

  it('guesses the company name from the page title, or else the domain', () => {
    expect(guessCompanyNameFromPage('Agicap | Logiciel de gestion de trésorerie', 'agicap.com')).toBe('Agicap');
    expect(guessCompanyNameFromPage('Pricing - Pennylane', 'pennylane.com')).toBe('Pennylane');
    expect(guessCompanyNameFromPage('The best tool for finance teams', 'qonto.com')).toBe('Qonto');
  });
});
