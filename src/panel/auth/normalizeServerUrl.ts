const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'];

export const normalizeServerUrl = (input: string): string => {
  const trimmed = input.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  const isLoopback = LOOPBACK_HOSTS.includes(url.hostname);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error("L'URL doit être en HTTPS (sauf localhost).");
  }

  return url.origin;
};
