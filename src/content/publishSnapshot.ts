import { type ExtensionMessage, type PageSnapshot } from '../shared/types';

const REFRESH_DELAY_MS = 400;

// Reloading the extension orphans scripts already injected in open tabs: chrome.runtime disappears.
const isExtensionAlive = () => Boolean(globalThis.chrome?.runtime?.id);

export const publishSnapshot = (extract: () => PageSnapshot) => {
  let lastSignature = '';
  let refreshTimer: number | undefined;
  let observer: MutationObserver | null = null;

  const stop = () => {
    observer?.disconnect();
    window.clearTimeout(refreshTimer);
    window.removeEventListener('hashchange', scheduleRefresh);
    window.removeEventListener('popstate', scheduleRefresh);
  };

  const publishIfChanged = () => {
    if (!isExtensionAlive()) {
      stop();

      return;
    }

    const snapshot = extract();
    const signature = JSON.stringify(snapshot);

    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;

    const message: ExtensionMessage = { type: 'snapshotChanged', snapshot };

    try {
      // Rejects when the side panel is closed, which is expected.
      chrome.runtime.sendMessage(message).catch(() => undefined);
    } catch {
      stop();
    }
  };

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(publishIfChanged, REFRESH_DELAY_MS);
  }

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'getSnapshot') {
      sendResponse(extract());
    }
  });

  observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleRefresh);
  window.addEventListener('popstate', scheduleRefresh);
  scheduleRefresh();

  return scheduleRefresh;
};
