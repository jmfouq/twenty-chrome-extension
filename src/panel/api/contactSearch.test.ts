import { describe, expect, it } from 'vitest';
import { buildContactSearchFilters } from './twentyApi';

describe('buildContactSearchFilters', () => {
  it('matches a single word against first name, last name and email', () => {
    expect(buildContactSearchFilters(' dupont ').people.or).toEqual([
      { name: { firstName: { ilike: '%dupont%' } } },
      { name: { lastName: { ilike: '%dupont%' } } },
      { emails: { primaryEmail: { ilike: '%dupont%' } } },
    ]);
  });

  it('matches a full name in either order', () => {
    expect(buildContactSearchFilters('Jean Dupont').people.or).toContainEqual({
      and: [{ name: { firstName: { ilike: '%Jean%' } } }, { name: { lastName: { ilike: '%Dupont%' } } }],
    });
    expect(buildContactSearchFilters('Dupont Jean').people.or).toContainEqual({
      and: [{ name: { lastName: { ilike: '%Dupont%' } } }, { name: { firstName: { ilike: '%Jean%' } } }],
    });
  });

  it('matches companies by name or domain', () => {
    expect(buildContactSearchFilters('acme').companies).toEqual({
      or: [{ name: { ilike: '%acme%' } }, { domainName: { primaryLinkUrl: { ilike: '%acme%' } } }],
    });
  });
});
