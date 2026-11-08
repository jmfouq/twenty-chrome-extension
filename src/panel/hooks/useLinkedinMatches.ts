import { useCallback, useEffect, useState } from 'react';
import { normalizeDomain, splitFullName } from '../../shared/emailDomains';
import { type LinkedinCompanyPage, type LinkedinPersonPage } from '../../shared/types';
import { type TwentyClient } from '../api/TwentyClient';
import {
  findCompaniesByDomains,
  findCompaniesByName,
  findCompanyByLinkedinUrl,
  findPeopleByName,
  findPersonByLinkedinUrl,
} from '../api/twentyApi';
import { type Company, type Person } from '../api/types';

type LinkedinMatchesState = {
  loading: boolean;
  error: string | null;
  person: Person | null;
  personCandidates: Person[];
  company: Company | null;
  companyCandidates: Company[];
};

const INITIAL_STATE: LinkedinMatchesState = {
  loading: true,
  error: null,
  person: null,
  personCandidates: [],
  company: null,
  companyCandidates: [],
};

const uniqueById = <TRecord extends { id: string }>(records: TRecord[]) => [
  ...new Map(records.map((record) => [record.id, record])).values(),
];

// Without read access to linkedinLink a record can never be linked, so a single name match is the best answer.
const resolveCandidates = <TRecord extends { id: string; linkedinLink?: unknown }>(candidates: TRecord[]) =>
  candidates.length === 1 && !('linkedinLink' in candidates[0])
    ? { match: candidates[0], candidates: [] }
    : { match: null, candidates };

const findPersonPageMatches = async (client: TwentyClient, page: LinkedinPersonPage) => {
  const [person, company] = await Promise.all([
    findPersonByLinkedinUrl(client, page.profileUrl),
    page.companyUrl ? findCompanyByLinkedinUrl(client, page.companyUrl) : null,
  ]);
  const name = splitFullName(page.fullName, '');
  const people = resolveCandidates(person || !name.lastName ? [] : await findPeopleByName(client, name));
  const companyByName = company || !page.companyName ? [] : await findCompaniesByName(client, page.companyName);

  return {
    person: person ?? people.match,
    personCandidates: people.candidates,
    company: company ?? companyByName[0] ?? null,
    companyCandidates: [],
  };
};

const findCompanyPageMatches = async (client: TwentyClient, page: LinkedinCompanyPage) => {
  const company = await findCompanyByLinkedinUrl(client, page.companyUrl);

  if (company) {
    return { person: null, personCandidates: [], company, companyCandidates: [] };
  }

  const domain = page.website ? normalizeDomain(page.website) : null;
  const [byDomain, byName] = await Promise.all([
    domain ? findCompaniesByDomains(client, [domain]) : new Map<string, Company>(),
    findCompaniesByName(client, page.name),
  ]);

  const companies = resolveCandidates(uniqueById([...byDomain.values(), ...byName]));

  return { person: null, personCandidates: [], company: companies.match, companyCandidates: companies.candidates };
};

export const useLinkedinMatches = (client: TwentyClient, page: LinkedinPersonPage | LinkedinCompanyPage) => {
  const [state, setState] = useState<LinkedinMatchesState>(INITIAL_STATE);
  const lookupKey = JSON.stringify(page);

  const reload = useCallback(async () => {
    setState({ ...INITIAL_STATE, loading: true });

    try {
      const matches =
        page.kind === 'person' ? await findPersonPageMatches(client, page) : await findCompanyPageMatches(client, page);

      setState({ loading: false, error: null, ...matches });
    } catch (error) {
      setState({ ...INITIAL_STATE, loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  }, [client, lookupKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setPerson = useCallback(
    (person: Person) => setState((previous) => ({ ...previous, person, personCandidates: [] })),
    [],
  );

  const setCompany = useCallback(
    (company: Company) => setState((previous) => ({ ...previous, company, companyCandidates: [] })),
    [],
  );

  return { ...state, reload, setPerson, setCompany };
};
