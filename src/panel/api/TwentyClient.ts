import { refreshSession } from '../auth/connectToTwenty';
import { HttpError, requestJson } from '../auth/requestJson';
import { clearSession, type TwentySession } from '../auth/session';

const REFRESH_MARGIN_MS = 60_000;

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export type McpToolResult = {
  content?: { type: string; text?: string }[];
  isError?: boolean;
};

type McpResponse = {
  result?: McpToolResult;
  error?: { message: string };
};

export class SignedOutError extends Error {
  constructor() {
    super('Ta session Twenty a expiré. Reconnecte-toi.');
  }
}

export class TwentyApiError extends Error {
  constructor(
    message: string,
    readonly rawMessage: string,
  ) {
    super(message);
  }
}

export class TwentyClient {
  private refreshing: Promise<TwentySession> | null = null;

  constructor(
    private session: TwentySession,
    private readonly onSignedOut: () => void,
  ) {}

  get workspaceUrl() {
    return this.session.workspaceUrl;
  }

  get workspaceName() {
    return this.session.workspaceName;
  }

  getRecordUrl(objectNameSingular: 'person' | 'company' | 'opportunity', recordId: string) {
    return `${this.session.workspaceUrl}/object/${objectNameSingular}/${recordId}`;
  }

  graphql<TData>(query: string, variables: Record<string, unknown> = {}): Promise<TData> {
    return this.withFreshToken(() => this.send<TData>('graphql', query, variables));
  }

  metadata<TData>(query: string, variables: Record<string, unknown> = {}): Promise<TData> {
    return this.withFreshToken(() => this.send<TData>('metadata', query, variables));
  }

  // Direct mode lets app logic functions (such as People Data Labs) be called by their tool name.
  callTool(toolName: string, toolArguments: Record<string, unknown>): Promise<McpToolResult> {
    return this.withFreshToken(async () => {
      const response = await requestJson<McpResponse>(`${this.session.serverUrl}/mcp?mode=direct`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: toolName, arguments: toolArguments },
        }),
      });

      if (response.error || !response.result) {
        throw new TwentyApiError(
          response.error?.message ?? 'Réponse inattendue de Twenty.',
          response.error?.message ?? '',
        );
      }

      return response.result;
    });
  }

  private async withFreshToken<TResult>(run: () => Promise<TResult>): Promise<TResult> {
    if (this.session.expiresAt - REFRESH_MARGIN_MS < Date.now()) {
      await this.refresh();
    }

    try {
      return await run();
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) {
        throw error;
      }

      await this.refresh();

      return run();
    }
  }

  private async send<TData>(endpoint: 'graphql' | 'metadata', query: string, variables: Record<string, unknown>) {
    const response = await requestJson<GraphqlResponse<TData>>(`${this.session.serverUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.errors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED')) {
      throw new HttpError(401, response);
    }

    if (response.errors?.length || !response.data) {
      const message = response.errors?.[0]?.message ?? 'Réponse inattendue de Twenty.';

      throw new TwentyApiError(
        /no permission to (write|update|create)/i.test(message)
          ? 'Ton rôle dans Twenty ne permet pas cette modification.'
          : message,
        message,
      );
    }

    return response.data;
  }

  private async refresh() {
    this.refreshing ??= refreshSession(this.session).finally(() => {
      this.refreshing = null;
    });

    try {
      this.session = await this.refreshing;
    } catch {
      await clearSession();
      this.onSignedOut();
      throw new SignedOutError();
    }
  }
}
