import { describe, expect, it } from 'vitest';
import { type PageSnapshot } from '../../shared/types';
import { getCompanyPageLinks, getPersonPageLinks } from './pageLinks';

const linkedinPersonPage: PageSnapshot = {
  source: 'linkedin',
  page: {
    kind: 'person',
    profileUrl: 'https://www.linkedin.com/in/alexandra/',
    fullName: 'Alexandra R',
    headline: null,
    jobTitle: null,
    companyName: 'ERNW',
    companyUrl: 'https://www.linkedin.com/company/ernw/',
    photoUrl: null,
  },
};

const gmailPage: PageSnapshot = {
  source: 'gmail',
  ownEmail: 'me@twenty.com',
  subject: null,
  contacts: [
    { email: 'alex@ernw.de', name: 'Alex' },
    { email: 'known@ernw.de', name: null },
  ],
  attachments: [],
};

describe('getPersonPageLinks', () => {
  it('links a person to the open LinkedIn profile', () => {
    expect(getPersonPageLinks(linkedinPersonPage, { id: 'p1', linkedinLink: { primaryLinkUrl: null } })).toEqual([
      {
        key: 'linkedin',
        label: 'Lier à ce profil LinkedIn',
        data: { linkedinLink: { primaryLinkUrl: 'https://www.linkedin.com/in/alexandra/' } },
      },
    ]);
  });

  it('offers nothing when the profile is already linked', () => {
    expect(
      getPersonPageLinks(linkedinPersonPage, {
        id: 'p1',
        linkedinLink: { primaryLinkUrl: 'https://www.linkedin.com/in/alexandra' },
      }),
    ).toEqual([]);
  });

  it('adds the email addresses of the open email that the person does not have yet', () => {
    expect(
      getPersonPageLinks(gmailPage, {
        id: 'p1',
        emails: { primaryEmail: 'Known@ernw.de', additionalEmails: [] },
      }),
    ).toEqual([
      {
        key: 'alex@ernw.de',
        label: "Ajouter l'email alex@ernw.de",
        data: { emails: { primaryEmail: 'Known@ernw.de', additionalEmails: ['alex@ernw.de'] } },
      },
    ]);
  });

  it('uses the email as primary when the person has none', () => {
    const [link] = getPersonPageLinks(gmailPage, { id: 'p1', emails: { primaryEmail: null, additionalEmails: null } });

    expect(link.data).toEqual({ emails: { primaryEmail: 'alex@ernw.de', additionalEmails: [] } });
  });
});

describe('getCompanyPageLinks', () => {
  it('offers no LinkedIn link when the workspace hides that field', () => {
    expect(getCompanyPageLinks(linkedinPersonPage, { id: 'c1' })).toEqual([]);
  });

  it('links a company to the LinkedIn page of the profile company', () => {
    expect(getCompanyPageLinks(linkedinPersonPage, { id: 'c1', linkedinLink: null })[0]).toMatchObject({
      label: 'Lier à la page LinkedIn de ERNW',
      data: { linkedinLink: { primaryLinkUrl: 'https://www.linkedin.com/company/ernw/' } },
    });
  });

  it('links a company to the open website and says when it replaces a domain', () => {
    const website: PageSnapshot = { source: 'website', url: 'https://ernw.de/', domain: 'ernw.de', suggestedName: 'ERNW' };

    expect(getCompanyPageLinks(website, { id: 'c1', domainName: null })[0].label).toBe('Lier au site ernw.de');
    expect(getCompanyPageLinks(website, { id: 'c1', domainName: { primaryLinkUrl: 'https://old.de' } })[0].label).toBe(
      'Remplacer old.de par ernw.de',
    );
    expect(getCompanyPageLinks(website, { id: 'c1', domainName: { primaryLinkUrl: 'https://ernw.de' } })).toEqual([]);
  });
});
