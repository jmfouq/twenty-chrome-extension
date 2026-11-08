const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const createRandomToken = (): string => toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

export const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));

  return toBase64Url(new Uint8Array(digest));
};
