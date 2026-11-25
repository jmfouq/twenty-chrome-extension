import { type ReactNode, useEffect, useState } from 'react';
import { type TwentyClient } from '../api/TwentyClient';
import { findPersonInteractions, type Meeting, type PersonInteractions } from '../api/twentyApi';

type InteractionSummaryProps = {
  client: TwentyClient;
  personId: string;
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Twenty returns this placeholder instead of a title or subject the user is not allowed to see.
const RESTRICTED_VALUE = 'FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED';

const displayText = (value: string | null, fallback: string) =>
  value === RESTRICTED_VALUE ? 'Contenu privé' : value || fallback;

const SummaryLine = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="field">
    <span className="field-label">{label}</span>
    <span className="field-value interaction-value">{children}</span>
  </div>
);

const MeetingLine = ({ label, meeting, upcoming }: { label: string; meeting: Meeting | null; upcoming: boolean }) => (
  <SummaryLine label={label}>
    {meeting ? (
      <>
        <span className="interaction-title">{displayText(meeting.title, 'Sans titre')}</span>
        <span className="muted">
          {(upcoming ? DATE_TIME_FORMAT : DATE_FORMAT).format(new Date(meeting.startsAt))}
          {upcoming && meeting.conferenceLink?.primaryLinkUrl && (
            <>
              {' · '}
              <a href={meeting.conferenceLink.primaryLinkUrl} target="_blank" rel="noreferrer">
                Rejoindre
              </a>
            </>
          )}
        </span>
      </>
    ) : (
      <span className="field-value-empty">Aucun</span>
    )}
  </SummaryLine>
);

export const InteractionSummary = ({ client, personId }: InteractionSummaryProps) => {
  const [interactions, setInteractions] = useState<PersonInteractions | null>(null);

  useEffect(() => {
    let cancelled = false;

    void findPersonInteractions(client, personId).then((found) => {
      if (!cancelled) {
        setInteractions(found);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [client, personId]);

  if (!interactions) {
    return <p className="muted interaction-loading">Chargement des échanges…</p>;
  }

  const { nextMeeting, lastMeeting, lastEmail } = interactions;

  return (
    <div className="interaction-summary">
      {nextMeeting !== undefined && <MeetingLine label="Prochain meeting" meeting={nextMeeting} upcoming />}
      {lastMeeting !== undefined && <MeetingLine label="Dernier meeting" meeting={lastMeeting} upcoming={false} />}
      {lastEmail !== undefined && (
        <SummaryLine label="Dernier email">
          {lastEmail ? (
            <>
              <span className="interaction-title">{displayText(lastEmail.subject, 'Sans objet')}</span>
              <span className="muted">{DATE_FORMAT.format(new Date(lastEmail.receivedAt))}</span>
            </>
          ) : (
            <span className="field-value-empty">Aucun</span>
          )}
        </SummaryLine>
      )}
    </div>
  );
};
