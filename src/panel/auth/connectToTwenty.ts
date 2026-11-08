import { createCodeChallenge, createRandomToken } from './pkce';
import { requestJson } from './requestJson';
import { readClientId, writeClientId, writeSession, type TwentySession } from './session';

type OAuthDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type CurrentWorkspaceResponse = {
  data?: {
    currentWorkspace: {
      displayName: string | null;
      subdomain: string;
      workspaceUrls: { subdomainUrl: string; customUrl: string | null };
    };
  };
};

const CLIENT_NAME = 'Twenty for Gmail';
const SCOPE = 'api profile';

const registerClient = async (discovery: OAuthDiscovery, redirectUri: string) => {
  const registration = await requestJson<{ client_id: string }>(discovery.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SCOPE,
    }),
  });

  await writeClientId(discovery.issuer, registration.client_id);

  return registration.client_id;
};

const authorize = async (discovery: OAuthDiscovery, clientId: string, redirectUri: string, codeVerifier: string) => {
  const state = createRandomToken();
  const authorizationUrl = new URL(discovery.authorization_endpoint);

  Object.entries({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: await createCodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  }).forEach(([name, value]) => authorizationUrl.searchParams.set(name, value));

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizationUrl.href,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('Connexion annulée.');
  }

  const response = new URL(responseUrl);
  const issuer = response.searchParams.get('iss');

  if (response.searchParams.get('state') !== state) {
    throw new Error('Réponse de connexion invalide (state).');
  }

  if (issuer && issuer !== discovery.issuer) {
    throw new Error('Twenty a renvoyé un émetteur OAuth inattendu.');
  }

  const code = response.searchParams.get('code');

  if (!code) {
    throw new Error(response.searchParams.get('error_description') ?? 'Connexion refusée.');
  }

  return code;
};

const fetchWorkspace = async (serverUrl: string, accessToken: string) => {
  const response = await requestJson<CurrentWorkspaceResponse>(`${serverUrl}/metadata`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query TwentyForGmailWorkspace { currentWorkspace { displayName subdomain workspaceUrls { subdomainUrl customUrl } } }',
    }),
  });
  const workspace = response.data?.currentWorkspace;

  return {
    workspaceUrl: (workspace?.workspaceUrls.customUrl ?? workspace?.workspaceUrls.subdomainUrl ?? serverUrl).replace(
      /\/$/,
      '',
    ),
    workspaceName: workspace?.displayName ?? workspace?.subdomain ?? 'Twenty',
  };
};

export const connectToTwenty = async (serverUrl: string): Promise<TwentySession> => {
  const discovery = await requestJson<OAuthDiscovery>(`${serverUrl}/.well-known/oauth-authorization-server`).catch(
    () => {
      throw new Error(`Impossible de joindre Twenty sur ${serverUrl}. Vérifie l'URL.`);
    },
  );
  const redirectUri = chrome.identity.getRedirectURL();
  const clientId = (await readClientId(discovery.issuer)) ?? (await registerClient(discovery, redirectUri));
  const codeVerifier = createRandomToken();

  try {
    const code = await authorize(discovery, clientId, redirectUri, codeVerifier);
    const tokens = await requestJson<TokenResponse>(discovery.token_endpoint, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });
    const session: TwentySession = {
      serverUrl: discovery.issuer,
      clientId,
      tokenEndpoint: discovery.token_endpoint,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      ...(await fetchWorkspace(discovery.issuer, tokens.access_token)),
    };

    await writeSession(session);

    return session;
  } catch (error) {
    // The cached client may have been cleaned up server side; register a fresh one next time.
    await writeClientId(discovery.issuer, null);
    throw error;
  }
};

export const refreshSession = async (session: TwentySession): Promise<TwentySession> => {
  const tokens = await requestJson<TokenResponse>(session.tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: session.clientId,
    }),
  });
  const refreshed: TwentySession = {
    ...session,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  await writeSession(refreshed);

  return refreshed;
};
