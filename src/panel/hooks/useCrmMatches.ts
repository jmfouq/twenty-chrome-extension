import { useCallback, useEffect, useMemo, useState } from 'react';
import { getEmailDomain, isPersonalEmailDomain } from '../../shared/emailDomains';
import { type DetectedContact } from '../../shared/types';
import { type TwentyClient } from '../api/TwentyClient';
import { findCompaniesByDomains, findPeopleByEmails } from '../api/twentyApi';
import { type Company, type Person } from '../api/types';

type CrmMatchesState = {
  loading: boolean;
  error: string | null;
  peopleByEmail: Map<string, Person>;
  companiesByDomain: Map<string, Company>;
};

export const getCompanyDomains = (contacts: DetectedContact[]) => [
  ...new Set(
    contacts.map((contact) => getEmailDomain(contact.email)).filter((domain) => !isPersonalEmailDomain(domain)),
  ),
];

export const useCrmMatches = (client: TwentyClient, contacts: DetectedContact[]) => {
  const emails = useMemo(() => contacts.map((contact) => contact.email), [contacts]);
  const domains = useMemo(() => getCompanyDomains(contacts), [contacts]);
  const lookupKey = JSON.stringify([emails, domains]);
  const [state, setState] = useState<CrmMatchesState>({
    loading: true,
    error: null,
    peopleByEmail: new Map(),
    companiesByDomain: new Map(),
  });

  const reload = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const [peopleByEmail, companiesByDomain] = await Promise.all([
        findPeopleByEmails(client, emails),
        findCompaniesByDomains(client, domains),
      ]);

      setState({ loading: false, error: null, peopleByEmail, companiesByDomain });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [client, lookupKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertPerson = useCallback((email: string, person: Person) => {
    setState((previous) => ({
      ...previous,
      peopleByEmail: new Map(previous.peopleByEmail).set(email, person),
    }));
  }, []);

  const upsertCompany = useCallback((domain: string, company: Company) => {
    setState((previous) => ({
      ...previous,
      companiesByDomain: new Map(previous.companiesByDomain).set(domain, company),
    }));
  }, []);

  return { ...state, domains, reload, upsertPerson, upsertCompany };
};
