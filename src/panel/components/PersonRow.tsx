import { type ReactNode, useState } from 'react';
import { formatTwentyPhone, toTwentyPhone } from '../../shared/phone';
import { type TwentyClient } from '../api/TwentyClient';
import { findPersonById, updatePerson } from '../api/twentyApi';
import { type Company, type Person } from '../api/types';
import { ActivityPanel } from './ActivityPanel';
import { AddButton } from './AddButton';
import { AskAiButton } from './AskAiButton';
import { EnrichButton } from './EnrichButton';
import { Avatar } from './Avatar';
import { EditableField } from './EditableField';
import { OpportunityList } from './OpportunityList';

type PersonRowProps = {
  client: TwentyClient;
  fallbackName: string;
  fallbackSubtitle: string | null;
  fallbackImageUrl?: string | null;
  person: Person | undefined;
  suggestedCompany: Company | undefined;
  addLabel?: string;
  addTitle?: string;
  extraAction?: ReactNode;
  defaultExpanded?: boolean;
  subject: string | null;
  onAdd: () => Promise<void>;
  onPersonUpdated: (person: Person) => void;
};

const getPersonName = (person: Person) =>
  [person.name?.firstName, person.name?.lastName].filter(Boolean).join(' ').trim();

export const PersonRow = ({
  client,
  fallbackName,
  fallbackSubtitle,
  fallbackImageUrl,
  person,
  suggestedCompany,
  addLabel = 'Ajouter',
  addTitle,
  extraAction,
  defaultExpanded = false,
  subject,
  onAdd,
  onPersonUpdated,
}: PersonRowProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayName = (person && getPersonName(person)) || fallbackName;
  const subtitle = [person?.jobTitle, fallbackSubtitle].filter(Boolean).join(' · ');

  const save = (data: Record<string, unknown>) => async () => {
    if (person) {
      onPersonUpdated(await updatePerson(client, person.id, data));
    }
  };

  const saveField = (buildData: (value: string) => Record<string, unknown>) => (value: string) =>
    save(buildData(value))();

  return (
    <li className={`record ${expanded ? 'record-expanded' : ''}`}>
      <div className="record-header">
        <button
          type="button"
          className="record-summary"
          disabled={!person}
          onClick={() => setExpanded((value) => !value)}
        >
          <Avatar label={displayName} imageUrl={person?.avatarUrl || fallbackImageUrl} />
          <span className="record-text">
            <span className="record-title">{displayName}</span>
            {subtitle && <span className="record-subtitle">{subtitle}</span>}
          </span>
          {person && <span className="chevron">{expanded ? '▾' : '▸'}</span>}
        </button>
        {extraAction}
        {!person && <AddButton label={addLabel} title={addTitle} onAdd={onAdd} />}
      </div>

      {person && expanded && (
        <div className="record-details">
          {'name' in person && (
            <EditableField
              label="Prénom"
              value={person.name?.firstName || null}
              onSave={saveField((firstName) => ({ name: { firstName } }))}
            />
          )}
          {'name' in person && (
            <EditableField
              label="Nom"
              value={person.name?.lastName || null}
              onSave={saveField((lastName) => ({ name: { lastName } }))}
            />
          )}
          {'jobTitle' in person && (
            <EditableField
              label="Poste"
              value={person.jobTitle ?? null}
              onSave={saveField((jobTitle) => ({ jobTitle }))}
            />
          )}
          {'phones' in person && (
            <EditableField
              label="Téléphone"
              value={person.phones ? formatTwentyPhone(person.phones) : null}
              onSave={saveField((value) => ({ phones: toTwentyPhone(value) }))}
            />
          )}
          {'linkedinLink' in person && (
            <EditableField
              label="LinkedIn"
              isLink
              value={person.linkedinLink?.primaryLinkUrl || null}
              onSave={saveField((primaryLinkUrl) => ({ linkedinLink: { primaryLinkUrl } }))}
            />
          )}
          <div className="field">
            <span className="field-label">Société</span>
            {person.company ? (
              <a
                className="field-link"
                href={client.getRecordUrl('company', person.company.id)}
                target="_blank"
                rel="noreferrer"
              >
                {person.company.name || 'Sans nom'}
              </a>
            ) : suggestedCompany ? (
              <button
                type="button"
                className="button-small"
                onClick={() => void save({ companyId: suggestedCompany.id })()}
              >
                Rattacher à {suggestedCompany.name}
              </button>
            ) : (
              <span className="field-value field-value-empty">Aucune</span>
            )}
          </div>

          <OpportunityList
            client={client}
            personIds={[person.id]}
            companyIds={person.companyId ? [person.companyId] : []}
          />
          <ActivityPanel client={client} target={{ personId: person.id }} defaultTitle={subject} />

          <div className="record-actions">
            <EnrichButton
              client={client}
              objectNameSingular="person"
              recordId={person.id}
              onEnriched={async () => onPersonUpdated(await findPersonById(client, person.id))}
            />
            <AskAiButton
              client={client}
              context={{ objectNameSingular: 'person', recordId: person.id }}
              contextLabel={displayName}
            />
          </div>

          <a className="open-link" href={client.getRecordUrl('person', person.id)} target="_blank" rel="noreferrer">
            Ouvrir dans Twenty ↗
          </a>
        </div>
      )}
    </li>
  );
};
