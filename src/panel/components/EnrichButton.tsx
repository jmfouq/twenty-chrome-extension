import { useState } from 'react';
import { enrichWithPeopleDataLabs } from '../api/peopleDataLabs';
import { type TwentyClient } from '../api/TwentyClient';

type EnrichButtonProps = {
  client: TwentyClient;
  objectNameSingular: 'person' | 'company';
  recordId: string;
  onEnriched: () => Promise<void>;
};

type EnrichState = { status: 'idle' } | { status: 'running' } | { status: 'done' | 'error'; message: string };

export const EnrichButton = ({ client, objectNameSingular, recordId, onEnriched }: EnrichButtonProps) => {
  const [state, setState] = useState<EnrichState>({ status: 'idle' });

  const enrich = async () => {
    setState({ status: 'running' });

    try {
      const outcome = await enrichWithPeopleDataLabs(client, objectNameSingular, recordId);

      if (outcome.status === 'matched') {
        await onEnriched();
      }

      setState({ status: 'done', message: outcome.message });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="enrich">
      <button
        type="button"
        className="button-secondary enrich-button"
        disabled={state.status === 'running'}
        title="Complète les champs vides avec People Data Labs"
        onClick={() => void enrich()}
      >
        <img src="/icons/people-data-labs.svg" alt="" />
        {state.status === 'running' ? 'Enrichissement…' : 'Enrichir avec People Data Labs'}
      </button>
      {(state.status === 'done' || state.status === 'error') && (
        <span className={state.status === 'error' ? 'field-error' : 'enrich-message'}>{state.message}</span>
      )}
    </div>
  );
};
