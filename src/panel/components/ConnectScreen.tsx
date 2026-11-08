import { useEffect, useState, type FormEvent } from 'react';
import { connectToTwenty } from '../auth/connectToTwenty';
import { normalizeServerUrl } from '../auth/normalizeServerUrl';
import { readLastServerUrl, type TwentySession } from '../auth/session';

type ConnectScreenProps = {
  message?: string | null;
  onConnected: (session: TwentySession) => void;
};

const DEFAULT_SERVER_URL = 'https://api.twenty.com';

export const ConnectScreen = ({ message, onConnected }: ConnectScreenProps) => {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(message ?? null);

  useEffect(() => {
    void readLastServerUrl().then((lastServerUrl) => lastServerUrl && setServerUrl(lastServerUrl));
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    let origin: string;

    try {
      origin = normalizeServerUrl(serverUrl);
    } catch (urlError) {
      setError(urlError instanceof Error ? urlError.message : String(urlError));

      return;
    }

    setConnecting(true);

    // The permission prompt must be requested synchronously from the click.
    chrome.permissions
      .request({ origins: [`${origin}/*`] })
      .then((granted) => {
        if (!granted) {
          throw new Error(`L'extension a besoin d'accéder à ${origin} pour lire ton CRM.`);
        }

        return connectToTwenty(origin);
      })
      .then(onConnected)
      .catch((connectError: unknown) => {
        setError(connectError instanceof Error ? connectError.message : String(connectError));
      })
      .finally(() => setConnecting(false));
  };

  return (
    <div className="connect-screen">
      <img className="connect-logo" src="/icons/twenty.svg" alt="" />
      <h1>Connecte ton Twenty</h1>
      <p className="muted">
        Retrouve dans Gmail les contacts et sociétés de ton CRM, ajoute-les en un clic et mets-les à jour sans quitter
        ta boîte mail.
      </p>
      <form onSubmit={handleSubmit} className="connect-form">
        <label>
          URL du serveur Twenty
          <input
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder={DEFAULT_SERVER_URL}
            autoFocus
          />
        </label>
        <p className="hint">
          Twenty Cloud : laisse {DEFAULT_SERVER_URL}. Auto-hébergé : l'URL de ton serveur (ex.
          https://crm.monentreprise.com).
        </p>
        <button type="submit" className="button-primary button-block" disabled={connecting}>
          {connecting ? 'Connexion en cours…' : 'Se connecter avec Twenty'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};
