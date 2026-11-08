import { extractLinkedinSnapshot } from './extractLinkedinSnapshot';
import { findWebsiteInAboutPage } from './findWebsiteInAboutPage';
import { publishSnapshot } from './publishSnapshot';

const websitesByCompanyUrl = new Map<string, string | null>();

const getAboutPageWebsite = (companyUrl: string) => {
  if (websitesByCompanyUrl.has(companyUrl)) {
    return websitesByCompanyUrl.get(companyUrl) ?? null;
  }

  websitesByCompanyUrl.set(companyUrl, null);

  fetch(`${companyUrl}/about/`, { credentials: 'include' })
    .then((response) => (response.ok ? response.text() : ''))
    .then((html) => {
      const website = findWebsiteInAboutPage(html);

      if (website) {
        websitesByCompanyUrl.set(companyUrl, website);
        requestRefresh();
      }
    })
    .catch(() => undefined);

  return null;
};

const requestRefresh = publishSnapshot(() => ({
  source: 'linkedin',
  ...extractLinkedinSnapshot(document, location.href, { getAboutPageWebsite }),
}));
