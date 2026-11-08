import { normalizeDomain, splitFullName } from '../../shared/emailDomains';
import { type LinkedinCompanyPage, type LinkedinPersonPage } from '../../shared/types';
import { type TwentyClient } from '../api/TwentyClient';
import { createCompany, createPerson, updateCompany, updatePerson } from '../api/twentyApi';
import { useLinkedinMatches } from '../hooks/useLinkedinMatches';
import { AddButton } from './AddButton';
import { CompanyRow } from './CompanyRow';
import { getCompanyPageSuggestions, getPersonPageSuggestions } from './linkedinSuggestions';
import { SuggestionList } from './SuggestionList';
import { PersonRow } from './PersonRow';

type LinkedinViewProps = {
  client: TwentyClient;
  page: LinkedinPersonPage | LinkedinCompanyPage;
};

export const LinkedinView = ({ client, page }: LinkedinViewProps) => {
  const matches = useLinkedinMatches(client, page);
  const { loading, error, person, personCandidates, company, companyCandidates, reload, setPerson, setCompany } =
    matches;

  const addCompanyFromPersonPage = async () => {
    if (page.kind !== 'person' || !page.companyName) {
      return null;
    }

    const created = await createCompany(client, { name: page.companyName, linkedinUrl: page.companyUrl });

    setCompany(created);

    if (person) {
      setPerson(await updatePerson(client, person.id, { companyId: created.id }));
    }

    return created;
  };

  const addPersonFromPage = async () => {
    if (page.kind !== 'person') {
      return;
    }

    const personCompany = company ?? (await addCompanyFromPersonPage());

    setPerson(
      await createPerson(client, {
        ...splitFullName(page.fullName, ''),
        jobTitle: page.jobTitle ?? page.headline,
        linkedinUrl: page.profileUrl,
        companyId: personCompany?.id ?? null,
      }),
    );
  };

  const addCompanyFromCompanyPage = async () => {
    if (page.kind !== 'company') {
      return;
    }

    setCompany(
      await createCompany(client, {
        name: page.name,
        domain: page.website ? normalizeDomain(page.website) : null,
        linkedinUrl: page.companyUrl,
      }),
    );
  };

  const linkPerson = async (personId: string) => {
    if (page.kind === 'person') {
      setPerson(await updatePerson(client, personId, { linkedinLink: { primaryLinkUrl: page.profileUrl } }));
    }
  };

  const linkCompany = async (companyId: string, linkedinUrl: string) => {
    setCompany(await updateCompany(client, companyId, { linkedinLink: { primaryLinkUrl: linkedinUrl } }));
  };

  if (error) {
    return (
      <div className="main-view">
        <div className="banner banner-error">
          {error}
          <button type="button" className="button-small" onClick={() => void reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="muted padded">Recherche dans Twenty…</p>;
  }

  if (page.kind === 'company') {
    return (
      <div className="main-view">
        <SuggestionList
          suggestions={getCompanyPageSuggestions({
            company,
            linkedinWebsite: page.website,
            linkedinUrl: page.companyUrl,
            onExportDomain: async (domain) => {
              if (company) {
                setCompany(
                  await updateCompany(client, company.id, { domainName: { primaryLinkUrl: `https://${domain}` } }),
                );
              }
            },
            onExportLinkedinUrl: async () => {
              if (company) {
                await linkCompany(company.id, page.companyUrl);
              }
            },
          })}
        />
        <section className="section">
          <h3>Société</h3>
          {company ? (
            <ul className="record-list">
              <CompanyRow
                client={client}
                fallbackName={page.name}
                subtitle={normalizeDomain(company.domainName?.primaryLinkUrl ?? page.website ?? '')}
                logoUrl={page.logoUrl}
                company={company}
                defaultExpanded
                subject={null}
                onAdd={async () => undefined}
                onCompanyUpdated={setCompany}
              />
            </ul>
          ) : (
            <>
              {companyCandidates.length > 0 && (
                <>
                  <p className="muted">Cette page LinkedIn n'est liée à aucune société. Sociétés qui correspondent :</p>
                  <ul className="record-list">
                    {companyCandidates.map((candidate) => (
                      <CompanyRow
                        key={candidate.id}
                        client={client}
                        fallbackName={page.name}
                        subtitle={normalizeDomain(candidate.domainName?.primaryLinkUrl ?? '')}
                        logoUrl={page.logoUrl}
                        company={candidate}
                        extraAction={
                          'linkedinLink' in candidate ? (
                            <AddButton label="Lier" onAdd={() => linkCompany(candidate.id, page.companyUrl)} />
                          ) : undefined
                        }
                        subject={null}
                        onAdd={async () => undefined}
                        onCompanyUpdated={setCompany}
                      />
                    ))}
                  </ul>
                </>
              )}
              <ul className="record-list">
                <CompanyRow
                  client={client}
                  fallbackName={page.name}
                  subtitle={
                    companyCandidates.length > 0
                      ? 'Nouvelle fiche'
                      : page.website
                        ? normalizeDomain(page.website)
                        : null
                  }
                  logoUrl={page.logoUrl}
                  company={undefined}
                  subject={null}
                  onAdd={addCompanyFromCompanyPage}
                  onCompanyUpdated={setCompany}
                />
              </ul>
            </>
          )}
        </section>
      </div>
    );
  }

  const companySubtitle = page.companyName ?? page.headline;

  return (
    <div className="main-view">
      <SuggestionList
        suggestions={getPersonPageSuggestions({
          person,
          company,
          linkedinJobTitle: page.jobTitle,
          linkedinCompanyName: page.companyName,
          onExportJobTitle: async (jobTitle) => {
            if (person) {
              setPerson(await updatePerson(client, person.id, { jobTitle }));
            }
          },
          onCreateCompany: async () => {
            await addCompanyFromPersonPage();
          },
          onAttachCompany: async (target) => {
            if (person) {
              setPerson(await updatePerson(client, person.id, { companyId: target.id }));
            }
          },
        })}
      />

      <section className="section">
        <h3>Personne</h3>
        {personCandidates.length > 0 && (
          <>
            <p className="muted">Ce profil LinkedIn n'est lié à aucune fiche. Fiches avec le même nom :</p>
            <ul className="record-list">
              {personCandidates.map((candidate) => (
                <PersonRow
                  key={candidate.id}
                  client={client}
                  fallbackName={page.fullName}
                  fallbackSubtitle={candidate.company?.name ?? candidate.emails?.primaryEmail ?? null}
                  person={candidate}
                  suggestedCompany={company ?? undefined}
                  extraAction={
                    'linkedinLink' in candidate ? (
                      <AddButton label="Lier" onAdd={() => linkPerson(candidate.id)} />
                    ) : undefined
                  }
                  subject={null}
                  onAdd={async () => undefined}
                  onPersonUpdated={setPerson}
                />
              ))}
            </ul>
          </>
        )}
        <ul className="record-list">
          <PersonRow
            client={client}
            fallbackName={page.fullName}
            fallbackSubtitle={
              person
                ? (person.company?.name ?? null)
                : [personCandidates.length > 0 && 'Nouvelle fiche', companySubtitle].filter(Boolean).join(' · ')
            }
            fallbackImageUrl={page.photoUrl}
            person={person ?? undefined}
            suggestedCompany={company ?? undefined}
            addLabel={personCandidates.length > 0 ? 'Créer' : 'Ajouter'}
            addTitle={!company && page.companyName ? `Crée aussi la société ${page.companyName}` : undefined}
            defaultExpanded
            subject={null}
            onAdd={addPersonFromPage}
            onPersonUpdated={setPerson}
          />
        </ul>
      </section>

      {company && (
        <section className="section">
          <h3>Société</h3>
          <ul className="record-list">
            <CompanyRow
              client={client}
              fallbackName={page.companyName ?? ''}
              subtitle={normalizeDomain(company.domainName?.primaryLinkUrl ?? '')}
              logoUrl={null}
              company={company}
              extraAction={
                page.companyUrl && 'linkedinLink' in company && !company.linkedinLink?.primaryLinkUrl ? (
                  <AddButton label="Lier" onAdd={() => linkCompany(company.id, page.companyUrl ?? '')} />
                ) : undefined
              }
              subject={null}
              onAdd={async () => undefined}
              onCompanyUpdated={setCompany}
            />
          </ul>
        </section>
      )}
    </div>
  );
};
