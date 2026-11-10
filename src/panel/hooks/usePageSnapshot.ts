import { useEffect, useRef, useState } from 'react';
import { getRegistrableDomain, guessCompanyNameFromPage } from '../../shared/emailDomains';
import { type ExtensionMessage, type PageSnapshot } from '../../shared/types';

export type PageSnapshotState =
  { status: 'loading' } | { status: 'unsupported' } | { status: 'ready'; snapshot: PageSnapshot };

const SUPPORTED_SITES = [
  { source: 'gmail', urlPrefix: 'https://mail.google.com/', contentScript: 'gmail-content.js' },
  { source: 'calendar', urlPrefix: 'https://calendar.google.com/', contentScript: 'calendar-content.js' },
  { source: 'linkedin', urlPrefix: 'https://www.linkedin.com/', contentScript: 'linkedin-content.js' },
] as const;

const toWebsiteSnapshot = (tab: chrome.tabs.Tab): PageSnapshot | null => {
  if (!tab.url?.match(/^https?:\/\//)) {
    return null;
  }

  const url = new URL(tab.url);

  if (!url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname)) {
    return null;
  }

  const domain = getRegistrableDomain(url.hostname);

  return { source: 'website', url: url.origin, domain, suggestedName: guessCompanyNameFromPage(tab.title, domain) };
};

const requestSnapshot = (tabId: number) =>
  chrome.tabs.sendMessage<ExtensionMessage, PageSnapshot>(tabId, { type: 'getSnapshot' });

const loadSnapshot = async (tabId: number, contentScript: string): Promise<PageSnapshot> => {
  try {
    return await requestSnapshot(tabId);
  } catch {
    // Tabs opened before the extension was installed have no content script yet.
    await chrome.scripting.executeScript({ target: { tabId }, files: [contentScript] });

    return requestSnapshot(tabId);
  }
};

export const usePageSnapshot = (): PageSnapshotState => {
  const [state, setState] = useState<PageSnapshotState>({ status: 'loading' });
  const activeTabIdRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const site = SUPPORTED_SITES.find(({ urlPrefix }) => tab?.url?.startsWith(urlPrefix));

      const websiteSnapshot = tab && !site ? toWebsiteSnapshot(tab) : null;

      if (tab?.id && websiteSnapshot) {
        activeTabIdRef.current = tab.id;
        setState({ status: 'ready', snapshot: websiteSnapshot });

        return;
      }

      if (!tab?.id || !site) {
        activeTabIdRef.current = null;
        setState({ status: 'unsupported' });

        return;
      }

      activeTabIdRef.current = tab.id;

      try {
        const snapshot = await loadSnapshot(tab.id, site.contentScript);

        if (activeTabIdRef.current === tab.id) {
          setState({ status: 'ready', snapshot });
        }
      } catch {
        setState({ status: 'unsupported' });
      }
    };

    const handleMessage = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'snapshotChanged' && sender.tab?.id === activeTabIdRef.current) {
        setState({ status: 'ready', snapshot: message.snapshot });
      }
    };

    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      const isActiveTabChange = tabId === activeTabIdRef.current && Boolean(changeInfo.url || changeInfo.title);

      if (changeInfo.status === 'complete' || isActiveTabChange) {
        void refresh();
      }
    };

    const handleTabActivated = () => void refresh();

    void refresh();
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.windows.onFocusChanged.addListener(handleTabActivated);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.windows.onFocusChanged.removeListener(handleTabActivated);
    };
  }, []);

  return state;
};
