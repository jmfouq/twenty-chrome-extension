import { normalizeDomain } from '../../shared/emailDomains';
import { isSameLinkedinUrl } from '../../shared/linkedinUrl';
import { type Company, type Person } from '../api/types';
import { type Suggestion } from './SuggestionList';

const isSameText = (first: string | null | undefined, second: string | null | undefined) =>
  (first ?? '').trim().toLowerCase() === (second ?? '').trim().toLowerCase();

const describeCurrentValue = (value: string | null | undefined) =>
  value ? `Dans Twenty : ${value}` : 'Vide dans Twenty';

export const getPersonPageSuggestions = ({
  person,
  company,
  linkedinJobTitle,
  linkedinCompanyName,
  onExportJobTitle,
  onCreateCompany,
  onAttachCompany,
}: {
  person: Person | null;
  company: Company | null;
  linkedinJobTitle: string | null;
  linkedinCompanyName: string | null;
  onExportJobTitle: (jobTitle: string) => Promise<void>;
  onCreateCompany: () => Promise<void>;
  onAttachCompany: (company: Company) => Promise<void>;
}): Suggestion[] => {
  const suggestions: Suggestion[] = [];
  const firstName = person?.name?.firstName || 'cette personne';

  if (person && 'jobTitle' in person && linkedinJobTitle && !isSameText(person.jobTitle, linkedinJobTitle)) {
    suggestions.push({
      key: 'jobTitle',
      title: `Poste : ${linkedinJobTitle}`,
      detail: describeCurrentValue(person.jobTitle),
      actionLabel: person.jobTitle ? 'Remplacer' : 'Exporter',
      onAction: () => onExportJobTitle(linkedinJobTitle),
    });
  }

  if (!company && linkedinCompanyName) {
    const currentCompany = person?.company?.name;

    suggestions.push({
      key: 'createCompany',
      title: `Société : ${linkedinCompanyName}`,
      detail: person
        ? `Absente de Twenty, ${firstName} y sera rattaché(e)${currentCompany ? ` au lieu de ${currentCompany}` : ''}`
        : 'Absente de Twenty',
      actionLabel: 'Créer',
      onAction: onCreateCompany,
    });
  }

  if (person && company && person.companyId !== company.id) {
    suggestions.push({
      key: 'attachCompany',
      title: `Société : ${company.name}`,
      detail: person.company?.name ? `Actuellement rattaché(e) à ${person.company.name}` : 'Pas encore rattaché(e)',
      actionLabel: 'Rattacher',
      onAction: () => onAttachCompany(company),
    });
  }

  return suggestions;
};

export const getCompanyPageSuggestions = ({
  company,
  linkedinWebsite,
  linkedinUrl,
  onExportDomain,
  onExportLinkedinUrl,
}: {
  company: Company | null;
  linkedinWebsite: string | null;
  linkedinUrl: string;
  onExportDomain: (domain: string) => Promise<void>;
  onExportLinkedinUrl: () => Promise<void>;
}): Suggestion[] => {
  if (!company) {
    return [];
  }

  const suggestions: Suggestion[] = [];
  const domain = linkedinWebsite ? normalizeDomain(linkedinWebsite) : null;
  const currentDomain = normalizeDomain(company.domainName?.primaryLinkUrl ?? '');

  if ('domainName' in company && domain && domain !== currentDomain) {
    suggestions.push({
      key: 'domain',
      title: `Domaine : ${domain}`,
      detail: describeCurrentValue(currentDomain),
      actionLabel: currentDomain ? 'Remplacer' : 'Exporter',
      onAction: () => onExportDomain(domain),
    });
  }

  const currentLinkedinUrl = company.linkedinLink?.primaryLinkUrl;

  if ('linkedinLink' in company && !isSameLinkedinUrl(currentLinkedinUrl, linkedinUrl)) {
    suggestions.push({
      key: 'linkedin',
      title: 'Page LinkedIn',
      detail: describeCurrentValue(currentLinkedinUrl),
      actionLabel: currentLinkedinUrl ? 'Remplacer' : 'Exporter',
      onAction: onExportLinkedinUrl,
    });
  }

  return suggestions;
};
