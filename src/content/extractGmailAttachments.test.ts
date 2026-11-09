import { describe, expect, it } from 'vitest';
import { extractGmailAttachments } from './extractGmailAttachments';

const buildDocument = (html: string) => new DOMParser().parseFromString(`<div role="main">${html}</div>`, 'text/html');

const URL_1 = 'https://mail.google.com/mail/u/0/?ui=2&ik=abc&attid=0.1&permmsgid=msg-1&view=att&disp=safe';
const URL_2 = 'https://mail.google.com/mail/u/0/?ui=2&ik=abc&attid=0.2&permmsgid=msg-1&view=att&disp=safe';

describe('extractGmailAttachments', () => {
  it('lists attachment chips of every open message with their sender', () => {
    const document = buildDocument(`
      <div class="adn">
        <span class="gD" email="erik@wallee.com" name="Erik Meierhof">Erik Meierhof</span>
        <div class="a3s"><img download_url="image/png:logo.png:${URL_2}" /></div>
        <div class="aQH">
          <span download_url="application/pdf:Contrat: v2.pdf:${URL_1}"></span>
          <a download_url="application/pdf:Contrat: v2.pdf:${URL_1}"></a>
        </div>
      </div>
    `);

    expect(extractGmailAttachments(document)).toEqual([
      { name: 'Contrat: v2.pdf', mimeType: 'application/pdf', downloadUrl: URL_1, senderName: 'Erik Meierhof' },
    ]);
  });

  it('ignores malformed or foreign download urls', () => {
    const document = buildDocument(`
      <div class="adn">
        <span download_url="application/pdf:file.pdf:https://evil.example.com/file.pdf"></span>
        <span download_url="nonsense"></span>
      </div>
    `);

    expect(extractGmailAttachments(document)).toEqual([]);
  });

  it('decodes percent-encoded file names', () => {
    const document = buildDocument(`
      <div class="adn">
        <span download_url="application/vnd.ms-excel:Plan%20de%20Compte%20%2B%20Strats.xlsx:${URL_1}"></span>
        <span download_url="application/pdf:50% off.pdf:${URL_2}"></span>
      </div>
    `);

    expect(extractGmailAttachments(document).map((attachment) => attachment.name)).toEqual([
      'Plan de Compte + Strats.xlsx',
      '50% off.pdf',
    ]);
  });
});
