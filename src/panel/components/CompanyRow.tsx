import { type ReactNode, useState } from 'react';
import { type TwentyClient } from '../api/TwentyClient';
import { findCompanyById, updateCompany } from '../api/twentyApi';
import { type Company } from '../api/types';
import { ActivityPanel } from './ActivityPanel';
import { AddButton } from './AddButton';
import { isConversationOpen } from '../api/askAiStore';
import { AskAiButton } from './AskAiButton';
import { EnrichButton } from './EnrichButton';
import { Avatar } from './Avatar';
import { EditableField } from './EditableField';
import { OpportunityList } from './OpportunityList';

type CompanyRowProps = {
  client: TwentyClient;
  fallbackName: string;
  subtitle: string | null;
  logoUrl: string | null;
  company: Company | undefined;
  extraAction?: ReactNode;
  defaultExpanded?: boolean;
  subject: string | null;
  onAdd: () => Promise<void>;
  onCompanyUpdated: (company: Company) => void;
};

export const CompanyRow = ({
  client,
  fallbackName,
  subtitle,
  logoUrl,
  company,
  extraAction,
  defaultExpanded = false,
  subject,
  onAdd,
  onCompanyUpdated,
}: CompanyRowProps) => {
  const [expanded, setExpanded] = useState(
    () => defaultExpanded || Boolean(company && isConversationOpen({ objectNameSingular: 'company', recordId: company.id })),
  );
  const displayName = company?.name || fallbackName;
  const owner = company?.accountOwner?.name;

  const saveField = (buildData: (value: string) => Record<string, unknown>) => async (value: string) => {
    if (company) {
      onCompanyUpdated(await updateCompany(client, company.id, buildData(value)));
    }
  };

  return (
    <li className={`record ${expanded ? 'record-expanded' : ''}`}>
      <div className="record-header">
        <button
          type="button"
          className="record-summary"
          disabled={!company}
          onClick={() => setExpanded((value) => !value)}
        >
          <Avatar label={displayName} imageUrl={logoUrl} shape="square" />
          <span className="record-text">
            <span className="record-title">{displayName}</span>
            {subtitle && <span className="record-subtitle">{subtitle}</span>}
          </span>
          {company && <span className="chevron">{expanded ? '▾' : '▸'}</span>}
        </button>
        {extraAction}
        {!company && <AddButton label="Ajouter" onAdd={onAdd} />}
      </div>

      {company && expanded && (
        <div className="record-details">
          {'name' in company && (
            <EditableField label="Nom" value={company.name ?? null} onSave={saveField((name) => ({ name }))} />
          )}
          {'domainName' in company && (
            <EditableField
              label="Domaine"
              isLink
              value={company.domainName?.primaryLinkUrl || null}
              onSave={saveField((primaryLinkUrl) => ({ domainName: { primaryLinkUrl } }))}
            />
          )}
          {'linkedinLink' in company && (
            <EditableField
              label="LinkedIn"
              isLink
              value={company.linkedinLink?.primaryLinkUrl || null}
              onSave={saveField((primaryLinkUrl) => ({ linkedinLink: { primaryLinkUrl } }))}
            />
          )}
          {'accountOwner' in company && (
            <div className="field">
              <span className="field-label">Responsable</span>
              <span className={`field-value ${owner ? '' : 'field-value-empty'}`}>
                {owner ? `${owner.firstName} ${owner.lastName}`.trim() : 'Aucun'}
              </span>
            </div>
          )}

          <OpportunityList client={client} personIds={[]} companyIds={[company.id]} />
          <ActivityPanel client={client} target={{ companyId: company.id }} defaultTitle={subject} />

          <div className="record-actions">
            <EnrichButton
              client={client}
              objectNameSingular="company"
              recordId={company.id}
              onEnriched={async () => onCompanyUpdated(await findCompanyById(client, company.id))}
            />
            <AskAiButton
              client={client}
              context={{ objectNameSingular: 'company', recordId: company.id }}
              contextLabel={displayName}
            />
          </div>

          <a className="open-link" href={client.getRecordUrl('company', company.id)} target="_blank" rel="noreferrer">
            Ouvrir dans Twenty ↗
          </a>
        </div>
      )}
    </li>
  );
};
