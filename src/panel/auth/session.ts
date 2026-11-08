export type TwentySession = {
  serverUrl: string;
  workspaceUrl: string;
  workspaceName: string;
  clientId: string;
  tokenEndpoint: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const SESSION_KEY = 'twentySession';
const CLIENT_IDS_KEY = 'twentyClientIdsByIssuer';
const LAST_SERVER_URL_KEY = 'twentyLastServerUrl';

export const readSession = async (): Promise<TwentySession | null> => {
  const stored = await chrome.storage.local.get(SESSION_KEY);

  return (stored[SESSION_KEY] as TwentySession | undefined) ?? null;
};

export const writeSession = (session: TwentySession) =>
  chrome.storage.local.set({ [SESSION_KEY]: session, [LAST_SERVER_URL_KEY]: session.serverUrl });

export const clearSession = () => chrome.storage.local.remove(SESSION_KEY);

export const readLastServerUrl = async (): Promise<string | null> => {
  const stored = await chrome.storage.local.get(LAST_SERVER_URL_KEY);

  return (stored[LAST_SERVER_URL_KEY] as string | undefined) ?? null;
};

export const readClientId = async (issuer: string): Promise<string | null> => {
  const stored = await chrome.storage.local.get(CLIENT_IDS_KEY);

  return (stored[CLIENT_IDS_KEY] as Record<string, string> | undefined)?.[issuer] ?? null;
};

export const writeClientId = async (issuer: string, clientId: string | null) => {
  const stored = await chrome.storage.local.get(CLIENT_IDS_KEY);
  const clientIds = { ...(stored[CLIENT_IDS_KEY] as Record<string, string> | undefined) };

  if (clientId) {
    clientIds[issuer] = clientId;
  } else {
    delete clientIds[issuer];
  }

  await chrome.storage.local.set({ [CLIENT_IDS_KEY]: clientIds });
};
