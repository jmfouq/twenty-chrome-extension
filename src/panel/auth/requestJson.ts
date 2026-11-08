export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(
      (body as { error_description?: string; message?: string } | null)?.error_description ??
        (body as { message?: string } | null)?.message ??
        `Twenty a répondu ${status}.`,
    );
  }
}

export const requestJson = async <TResponse>(url: string, init?: RequestInit): Promise<TResponse> => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    throw new HttpError(response.status, body);
  }

  return body as TResponse;
};
