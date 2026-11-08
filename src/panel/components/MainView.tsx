import {
  getEmailDomain,
  guessCompanyNameFromDomain,
  isPersonalEmailDomain,
  splitFullName,
} from '../../shared/emailDomains';
import { type DetectedContact, type GmailSnapshot } from '../../shared/types';
import { type TwentyClient } from '../api/TwentyClient';
import { createCompany, createPerson } from '../api/twentyApi';
import { type Company } from '../api/types';
import { useCrmMatches } from '../hooks/useCrmMatches';
import { AddButton } from './AddButton';
import { CompanyRow } from './CompanyRow';
import { PersonRow } from './PersonRow';

type MainViewProps = {
  client: TwentyClient;
  snapshot: GmailSnapshot;
};

export const MainView = ({ client, snapshot }: MainViewProps) => {
  const { contacts, subject } = snapshot;
  const { loading, error, peopleByEmail, companiesByDomain, domains, reload, upsertPerson, upsertCompany } =
    useCrmMatches(client, contacts);

  // State updates are async, so batch additions share a local map to avoid duplicate companies.
  const addCompany = async (domain: string, knownCompanies = new Map(companiesByDomain)): Promise<Company> => {
    const existing = knownCompanies.get(domain);

    if (existing) {
      return existing;
    }

    const company = await createCompany(client, { name: guessCompanyNameFromDomain(domain), domain });

    knownCompanies.set(domain, company);
    upsertCompany(domain, company);

    return company;
  };

  const addPerson = async (contact: DetectedContact, knownCompanies = new Map(companiesByDomain)) => {
    const domain = getEmailDomain(contact.email);
    const company = isPersonalEmailDomain(domain) ? null : await addCompany(domain, knownCompanies);
    const person = await createPerson(client, {
      ...splitFullName(contact.name, contact.email),
      email: contact.email,
      companyId: company?.id ?? null,
    });

    upsertPerson(contact.email, person);
  };

  const missingContacts = contacts.filter((contact) => !peopleByEmail.has(contact.email));
  const missingDomains = domains.filter((domain) => !companiesByDomain.has(domain));

  const addAll = async () => {
    const knownCompanies = new Map(companiesByDomain);

    for (const domain of missingDomains) {
      await addCompany(domain, knownCompanies);
    }

    for (const contact of missingContacts) {
      await addPerson(contact, knownCompanies);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="empty-state">
        <p>Ouvre un email pour voir ses contacts dans Twenty.</p>
      </div>
    );
  }

  const missingCount = missingContacts.length + missingDomains.length;

  return (
    <div className="main-view">
      {subject && <p className="thread-subject">{subject}</p>}

      {error && (
        <div className="banner banner-error">
          {error}
          <button type="button" className="button-small" onClick={() => void reload()}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && missingCount > 0 && (
        <div className="banner">
          <span>
            {missingCount} {missingCount > 1 ? 'éléments absents' : 'élément absent'} de Twenty
          </span>
          <AddButton label="Tout ajouter" onAdd={addAll} />
        </div>
      )}

      <section className="section">
        <h3>Personnes</h3>
        {loading ? (
          <p className="muted">Recherche dans Twenty…</p>
        ) : (
          <ul className="record-list">
            {contacts.map((contact) => {
              const domain = getEmailDomain(contact.email);

              return (
                <PersonRow
                  key={contact.email}
                  client={client}
                  fallbackName={contact.name || contact.email}
                  fallbackSubtitle={contact.email}
                  person={peopleByEmail.get(contact.email)}
                  suggestedCompany={companiesByDomain.get(domain)}
                  addTitle={
                    !isPersonalEmailDomain(domain) && !companiesByDomain.has(domain)
                      ? 'Crée aussi la société à partir du domaine'
                      : undefined
                  }
                  subject={subject}
                  onAdd={() => addPerson(contact)}
                  onPersonUpdated={(person) => upsertPerson(contact.email, person)}
                />
              );
            })}
          </ul>
        )}
      </section>

      {domains.length > 0 && (
        <section className="section">
          <h3>Sociétés</h3>
          {loading ? (
            <p className="muted">Recherche dans Twenty…</p>
          ) : (
            <ul className="record-list">
              {domains.map((domain) => (
                <CompanyRow
                  key={domain}
                  client={client}
                  fallbackName={domain}
                  subtitle={domain}
                  logoUrl={`https://twenty-icons.com/${domain}`}
                  company={companiesByDomain.get(domain)}
                  subject={subject}
                  onAdd={async () => {
                    await addCompany(domain);
                  }}
                  onCompanyUpdated={(company) => upsertCompany(domain, company)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
