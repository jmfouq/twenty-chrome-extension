import { useCallback, useEffect, useState } from 'react';
import { type WebsiteSnapshot } from '../../shared/types';
import { type TwentyClient } from '../api/TwentyClient';
import { createCompany, findCompaniesByDomains } from '../api/twentyApi';
import { type Company } from '../api/types';
import { CompanyRow } from './CompanyRow';

type WebsiteViewProps = {
  client: TwentyClient;
  website: WebsiteSnapshot;
};

type LookupState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; company: Company | null };

export const WebsiteView = ({ client, website }: WebsiteViewProps) => {
  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' });

  const load = useCallback(async () => {
    setLookup({ status: 'loading' });

    try {
      const companies = await findCompaniesByDomains(client, [website.domain]);

      setLookup({ status: 'ready', company: companies.get(website.domain) ?? null });
    } catch (error) {
      setLookup({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, [client, website.domain]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCompany = (company: Company) => setLookup({ status: 'ready', company });

  return (
    <div className="main-view">
      <section className="section">
        <h3>Société de ce site</h3>
        {lookup.status === 'loading' && <p className="muted">Recherche dans Twenty…</p>}
        {lookup.status === 'error' && (
          <div className="banner banner-error">
            {lookup.message}
            <button type="button" className="button-small" onClick={() => void load()}>
              Réessayer
            </button>
          </div>
        )}
        {lookup.status === 'ready' && (
          <ul className="record-list">
            <CompanyRow
              client={client}
              fallbackName={website.suggestedName}
              subtitle={lookup.company ? website.domain : `${website.domain} · absente de Twenty`}
              logoUrl={`https://twenty-icons.com/${website.domain}`}
              company={lookup.company ?? undefined}
              defaultExpanded
              subject={null}
              onAdd={async () => {
                setCompany(await createCompany(client, { name: website.suggestedName, domain: website.domain }));
              }}
              onCompanyUpdated={setCompany}
            />
          </ul>
        )}
      </section>
    </div>
  );
};
