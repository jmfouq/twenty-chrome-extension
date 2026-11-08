import { describe, expect, it } from 'vitest';
import { extractLinkedinSnapshot } from './extractLinkedinSnapshot';

const buildDocument = (body: string, title = 'LinkedIn') => {
  const document = new DOMParser().parseFromString(`<body>${body}</body>`, 'text/html');

  document.title = title;

  return document;
};

describe('extractLinkedinSnapshot', () => {
  it('returns no page outside profiles and company pages', () => {
    expect(
      extractLinkedinSnapshot(buildDocument('<main><h1>Feed</h1></main>'), 'https://www.linkedin.com/feed/'),
    ).toEqual({
      page: null,
    });
  });

  it('reads a profile with its current role', () => {
    const document = buildDocument(`
      <main>
        <h1>Jean Dupont, PhD</h1>
        <div class="text-body-medium break-words">Head of Sales chez Acme</div>
        <section>
          <div id="experience"></div>
          <ul>
            <li>
              <a href="https://www.linkedin.com/company/12345/"><img /></a>
              <span aria-hidden="true">Head of Sales</span>
              <span aria-hidden="true">Acme · CDI</span>
            </li>
            <li><span aria-hidden="true">Account Executive</span><span aria-hidden="true">Old Corp</span></li>
          </ul>
        </section>
      </main>
    `);

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/in/jean-dupont/?trk=x')).toEqual({
      page: {
        kind: 'person',
        profileUrl: 'https://www.linkedin.com/in/jean-dupont',
        fullName: 'Jean Dupont',
        headline: 'Head of Sales chez Acme',
        jobTitle: 'Head of Sales',
        companyName: 'Acme',
        companyUrl: 'https://www.linkedin.com/company/12345',
        photoUrl: null,
      },
    });
  });

  it('reads the role inside a company group and falls back to the page title', () => {
    const document = buildDocument(
      `
      <main>
        <section>
          <div id="experience"></div>
          <ul>
            <li>
              <a href="/company/acme/"></a>
              <span aria-hidden="true">Acme</span>
              <span aria-hidden="true">CDI · 5 ans</span>
              <ul><li><span aria-hidden="true">CTO</span><span aria-hidden="true">2022 - aujourd'hui</span></li></ul>
            </li>
          </ul>
        </section>
      </main>
    `,
      '(3) Marie Curie | LinkedIn',
    );

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/in/marie-curie/')).toMatchObject({
      page: {
        fullName: 'Marie Curie',
        jobTitle: 'CTO',
        companyName: 'Acme',
        companyUrl: 'https://www.linkedin.com/company/acme',
      },
    });
  });

  it('falls back to the headline for the role and company', () => {
    const document = buildDocument(`
      <main>
        <h1>Paul Martin</h1>
        <div class="text-body-medium break-words">Directeur commercial chez Rayon Commun | Énergie solaire</div>
      </main>
    `);

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/in/paul-martin/')).toMatchObject({
      page: { jobTitle: 'Directeur commercial', companyName: 'Rayon Commun', companyUrl: null },
    });
  });

  it('reads the 2025 profile layout from its top card', () => {
    const document = buildDocument(
      `
      <main>
        <section>
          <div>
            <div><a href="/in/christeltoriello/overlay/photo"><h2>Christel Toriello</h2></a><p>· 1er</p></div>
            <p>VP Global Revenue Operations, at Mirakl</p>
            <p>Mirakl · ESSEC - ESSEC Business School</p>
            <a href="https://www.linkedin.com/company/mirakl/" aria-label="Voir l’entreprise : Mirakl"><span>Mirakl</span></a>
          </div>
        </section>
        <aside><a href="https://www.linkedin.com/company/stripe/">Stripe</a></aside>
      </main>
    `,
      '(6) Christel Toriello | LinkedIn',
    );

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/in/christeltoriello/')).toMatchObject({
      page: {
        fullName: 'Christel Toriello',
        headline: 'VP Global Revenue Operations, at Mirakl',
        jobTitle: 'VP Global Revenue Operations',
        companyName: 'Mirakl',
        companyUrl: 'https://www.linkedin.com/company/mirakl',
      },
    });
  });

  it('ignores the extra positions count and prefers "@" over a dash in the headline', () => {
    const document = buildDocument(
      `
      <main>
        <section>
          <h2>Sacha Bismuth</h2>
          <p>Mirakl Ads - AMER @ Mirakl | Driving Retail Media Strategies</p>
          <div role="button"><img src="https://media.licdn.com/dms/image/v2/C560/company-logo_100_100/0" /><p>Mirakl + 13 autres</p></div>
        </section>
      </main>
    `,
      '(6) Sacha Bismuth | LinkedIn',
    );

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/in/sacha-bismuth/')).toMatchObject({
      page: { jobTitle: 'Mirakl Ads - AMER', companyName: 'Mirakl' },
    });
  });

  it('reads the 2025 company layout behind the safety redirect', () => {
    const document = buildDocument(
      `
      <main>
        <h2>Mirakl</h2>
        <img src="https://media.licdn.com/dms/image/v2/C560/company-logo_200_200/0" />
        <article><p>Great evening! <a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Flnkd.in%2Fabc"><span>lnkd.in/abc</span></a></p></article>
        <article><a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fevents.example.com%2F">events.example.com</a></article>
        <div><p>Site web</p></div>
        <div><a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fwww.mirakl.com&urlhash=x"><p>https://www.mirakl.com</p></a></div>
      </main>
    `,
      'Mirakl : À propos | LinkedIn',
    );

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/company/mirakl/about/')).toEqual({
      page: {
        kind: 'company',
        companyUrl: 'https://www.linkedin.com/company/mirakl',
        name: 'Mirakl',
        website: 'https://www.mirakl.com/',
        logoUrl: 'https://media.licdn.com/dms/image/v2/C560/company-logo_200_200/0',
      },
    });
  });

  it('does not take a link shared in a post as the company website', () => {
    const document = buildDocument(
      `<main><h2>Mirakl</h2><article><a href="https://events.example.com/">events.example.com</a></article></main>`,
      'Mirakl : Posts | LinkedIn',
    );

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/company/mirakl/')).toMatchObject({
      page: { name: 'Mirakl', website: null },
    });
  });

  it('reads a company page and its website behind the LinkedIn redirect', () => {
    const document = buildDocument(`
      <main>
        <h1>Acme</h1>
        <a href="https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww.acme.com%2F" aria-label="Visiter le site web">Site web</a>
      </main>
    `);

    expect(extractLinkedinSnapshot(document, 'https://www.linkedin.com/company/acme/about/')).toEqual({
      page: {
        kind: 'company',
        companyUrl: 'https://www.linkedin.com/company/acme',
        name: 'Acme',
        website: 'https://www.acme.com/',
        logoUrl: null,
      },
    });
  });
});
