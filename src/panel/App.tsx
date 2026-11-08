import { useEffect, useMemo, useState } from 'react';
import { TwentyClient } from './api/TwentyClient';
import { clearSession, readSession, type TwentySession } from './auth/session';
import { ConnectScreen } from './components/ConnectScreen';
import { LinkedinView } from './components/LinkedinView';
import { MainView } from './components/MainView';
import { usePageSnapshot } from './hooks/usePageSnapshot';

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out'; message: string | null }
  | { status: 'signed-in'; session: TwentySession };

export const App = () => {
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'loading' });
  const page = usePageSnapshot();

  useEffect(() => {
    void readSession().then((session) =>
      setSessionState(session ? { status: 'signed-in', session } : { status: 'signed-out', message: null }),
    );
  }, []);

  const session = sessionState.status === 'signed-in' ? sessionState.session : null;

  const client = useMemo(
    () =>
      session &&
      new TwentyClient(session, () =>
        setSessionState({ status: 'signed-out', message: 'Ta session a expiré. Reconnecte-toi.' }),
      ),
    [session],
  );

  const signOut = async () => {
    await clearSession();
    setSessionState({ status: 'signed-out', message: null });
  };

  if (sessionState.status === 'loading') {
    return null;
  }

  if (!client) {
    return (
      <ConnectScreen
        message={sessionState.status === 'signed-out' ? sessionState.message : null}
        onConnected={(newSession) => setSessionState({ status: 'signed-in', session: newSession })}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <a className="workspace-name" href={client.workspaceUrl} target="_blank" rel="noreferrer">
          <img className="connect-logo connect-logo-small" src="/icons/twenty.svg" alt="" />
          {client.workspaceName}
        </a>
        <button type="button" className="button-ghost" onClick={() => void signOut()}>
          Déconnexion
        </button>
      </header>

      {page.status === 'loading' && <p className="muted padded">Chargement…</p>}
      {page.status === 'unsupported' && (
        <div className="empty-state">
          <p>Ouvre un email dans Gmail, ou un profil ou une page entreprise sur LinkedIn.</p>
        </div>
      )}
      {page.status === 'ready' && page.snapshot.source === 'gmail' && (
        <MainView client={client} snapshot={page.snapshot} />
      )}
      {page.status === 'ready' &&
        page.snapshot.source === 'linkedin' &&
        (page.snapshot.page ? (
          <LinkedinView key={JSON.stringify(page.snapshot.page)} client={client} page={page.snapshot.page} />
        ) : (
          <div className="empty-state">
            <p>Ouvre le profil d'une personne ou la page d'une entreprise sur LinkedIn.</p>
          </div>
        ))}
    </div>
  );
};
