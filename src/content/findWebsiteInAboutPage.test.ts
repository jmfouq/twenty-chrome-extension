import { describe, expect, it } from 'vitest';
import { findWebsiteInAboutPage } from './findWebsiteInAboutPage';

describe('findWebsiteInAboutPage', () => {
  it('finds the external link that displays its own url', () => {
    const html = `
      <a href="https://www.linkedin.com/company/agicap/">Agicap</a>
      <a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Flnkd.in%2Fxyz">lnkd.in/xyz</a>
      <a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fevents.example.com%2Fpage">Inscrivez-vous</a>
      <a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fagicap.com&amp;urlhash=x"><p>https://agicap.com</p></a>
    `;

    expect(findWebsiteInAboutPage(html)).toBe('https://agicap.com/');
  });

  it('returns null when the page has no website', () => {
    expect(findWebsiteInAboutPage('<a href="https://www.linkedin.com/feed/">Feed</a>')).toBeNull();
  });
});
