import { useEffect, useState } from 'react';
import { type TwentyClient } from '../api/TwentyClient';
import { findOpportunities, getOpportunityStageOptions, updateOpportunity } from '../api/twentyApi';
import { type Opportunity, type SelectOption } from '../api/types';
import { ActivityPanel } from './ActivityPanel';
import { isConversationOpen } from '../api/askAiStore';
import { AskAiButton } from './AskAiButton';
import { EditableField } from './EditableField';

type OpportunityListProps = {
  client: TwentyClient;
  personIds: string[];
  companyIds: string[];
};

const DEFAULT_CURRENCY = 'EUR';
const MICROS_PER_UNIT = 1_000_000;

const formatAmount = (amount: Opportunity['amount']) => {
  if (!amount?.amountMicros || !amount.currencyCode) {
    return null;
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: amount.currencyCode,
    maximumFractionDigits: 0,
  }).format(amount.amountMicros / MICROS_PER_UNIT);
};

const formatStage = (stage: string | null, stageOptions: SelectOption[]) =>
  stage
    ? (stageOptions.find((option) => option.value === stage)?.label ??
      stage.charAt(0) + stage.slice(1).toLowerCase().replace(/_/g, ' '))
    : null;

const formatDate = (date: string | null) => (date ? new Date(date).toLocaleDateString('fr-FR') : null);

const toAmountInput = (value: string, currencyCode: string | null | undefined) => {
  const amount = Number(value.replace(/\s/g, '').replace(',', '.'));

  if (value !== '' && !Number.isFinite(amount)) {
    throw new Error('Montant invalide. Exemple : 25000');
  }

  return {
    amountMicros: value === '' ? null : Math.round(amount * MICROS_PER_UNIT),
    currencyCode: currencyCode || DEFAULT_CURRENCY,
  };
};

type OpportunityRowProps = {
  client: TwentyClient;
  opportunity: Opportunity;
  stageOptions: SelectOption[];
  onUpdated: (opportunity: Opportunity) => void;
};

const OpportunityRow = ({ client, opportunity, stageOptions, onUpdated }: OpportunityRowProps) => {
  const [expanded, setExpanded] = useState(() =>
    isConversationOpen({ objectNameSingular: 'opportunity', recordId: opportunity.id }),
  );

  const saveField = (buildData: (value: string) => Record<string, unknown>) => async (value: string) =>
    onUpdated(await updateOpportunity(client, opportunity.id, buildData(value)));

  return (
    <li className={`opportunity ${expanded ? 'opportunity-expanded' : ''}`}>
      <button type="button" className="opportunity-summary" onClick={() => setExpanded((value) => !value)}>
        <span className="opportunity-name">{opportunity.name || 'Sans nom'}</span>
        <span className="item-meta">
          {[
            formatStage(opportunity.stage, stageOptions),
            formatAmount(opportunity.amount),
            formatDate(opportunity.closeDate),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </button>

      {expanded && (
        <div className="opportunity-details">
          <EditableField label="Nom" value={opportunity.name} onSave={saveField((name) => ({ name }))} />
          <EditableField
            label="Étape"
            value={opportunity.stage}
            displayValue={formatStage(opportunity.stage, stageOptions)}
            options={stageOptions.length > 0 ? stageOptions : undefined}
            onSave={saveField((stage) => ({ stage: stage || null }))}
          />
          <EditableField
            label="Montant"
            inputType="number"
            value={opportunity.amount?.amountMicros ? String(opportunity.amount.amountMicros / MICROS_PER_UNIT) : null}
            displayValue={formatAmount(opportunity.amount)}
            onSave={saveField((value) => ({ amount: toAmountInput(value, opportunity.amount?.currencyCode) }))}
          />
          <EditableField
            label="Clôture"
            inputType="date"
            value={opportunity.closeDate ? opportunity.closeDate.slice(0, 10) : null}
            displayValue={formatDate(opportunity.closeDate)}
            onSave={saveField((closeDate) => ({ closeDate: closeDate ? new Date(closeDate).toISOString() : null }))}
          />
          <ActivityPanel client={client} target={{ opportunityId: opportunity.id }} defaultTitle={opportunity.name} />
          <div className="record-actions">
            <AskAiButton
              client={client}
              context={{ objectNameSingular: 'opportunity', recordId: opportunity.id }}
              contextLabel={opportunity.name || 'cette opportunité'}
            />
          </div>
          <a
            className="open-link"
            href={client.getRecordUrl('opportunity', opportunity.id)}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir dans Twenty ↗
          </a>
        </div>
      )}
    </li>
  );
};

export const OpportunityList = ({ client, personIds, companyIds }: OpportunityListProps) => {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [stageOptions, setStageOptions] = useState<SelectOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([personIds, companyIds]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([findOpportunities(client, { personIds, companyIds }), getOpportunityStageOptions(client)])
      .then(([result, options]) => {
        if (!cancelled) {
          setOpportunities(result);
          setStageOptions(options);
        }
      })
      .catch((loadError: unknown) => !cancelled && setError(String(loadError)));

    return () => {
      cancelled = true;
    };
    // personIds/companyIds are compared through `key`.
  }, [client, key]);

  const replaceOpportunity = (updated: Opportunity) =>
    setOpportunities((previous) => previous?.map((item) => (item.id === updated.id ? updated : item)) ?? null);

  return (
    <section className="subsection">
      <h4>Opportunités</h4>
      {error && <p className="error-text">{error}</p>}
      {!error && opportunities === null && <p className="muted">Chargement…</p>}
      {opportunities?.length === 0 && <p className="muted">Aucune opportunité.</p>}
      <ul className="item-list opportunity-list">
        {opportunities?.map((opportunity) => (
          <OpportunityRow
            key={opportunity.id}
            client={client}
            opportunity={opportunity}
            stageOptions={stageOptions}
            onUpdated={replaceOpportunity}
          />
        ))}
      </ul>
    </section>
  );
};
