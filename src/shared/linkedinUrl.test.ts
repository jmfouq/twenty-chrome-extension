import { describe, expect, it } from 'vitest';
import { isSameLinkedinUrl, parseLinkedinUrl, toCanonicalLinkedinUrl } from './linkedinUrl';

describe('linkedinUrl', () => {
  it('parses profile and company urls with or without protocol', () => {
    expect(parseLinkedinUrl('https://www.linkedin.com/in/Jean-Dupont/?trk=x')).toEqual({
      kind: 'person',
      slug: 'jean-dupont',
    });
    expect(parseLinkedinUrl('linkedin.com/company/acme/about/')).toEqual({ kind: 'company', slug: 'acme' });
    expect(parseLinkedinUrl('https://www.linkedin.com/feed/')).toBeNull();
  });

  it('compares urls by kind and slug only', () => {
    expect(isSameLinkedinUrl('https://fr.linkedin.com/in/jean-dupont', 'linkedin.com/in/jean-dupont/')).toBe(true);
    expect(isSameLinkedinUrl('linkedin.com/in/jean', 'linkedin.com/in/jean-dupont')).toBe(false);
  });

  it('builds a canonical url', () => {
    expect(toCanonicalLinkedinUrl('https://fr.linkedin.com/in/J%C3%A9r%C3%B4me/details/')).toBe(
      'https://www.linkedin.com/in/j%C3%A9r%C3%B4me',
    );
  });
});
