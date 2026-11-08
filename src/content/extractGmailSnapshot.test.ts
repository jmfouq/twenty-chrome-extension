import { describe, expect, it } from 'vitest';
import { extractGmailSnapshot } from './extractGmailSnapshot';

const buildDocument = (body: string, title = 'Boîte de réception - me@acme.com - Gmail') => {
  const document = new DOMParser().parseFromString(`<body>${body}</body>`, 'text/html');

  document.title = title;

  return document;
};

describe('extractGmailSnapshot', () => {
  it('returns no contacts when no thread is open', () => {
    const document = buildDocument('<div role="main"><span email="julia@helpscout.com">Julia</span></div>');

    expect(extractGmailSnapshot(document)).toEqual({
      ownEmail: 'me@acme.com',
      subject: null,
      contacts: [],
    });
  });

  it('hides colleagues sharing the user company domain', () => {
    const document = buildDocument(`
      <div role="main">
        <h2 class="hP">Sales execution</h2>
        <span email="erik@wallee.com" name="Erik Meierhoff">Erik</span>
        <span email="marie@acme.com" name="Marie">Marie</span>
      </div>
    `);

    expect(extractGmailSnapshot(document).contacts).toEqual([{ email: 'erik@wallee.com', name: 'Erik Meierhoff' }]);
  });

  it('lists participants of the open thread, excluding the user and automated senders', () => {
    const document = buildDocument(`
      <div role="main">
        <h2 class="hP">Partnership</h2>
        <span class="gD" email="Julia@HelpScout.com" name="Julia Martin">Julia Martin</span>
        <span class="g2" email="me@acme.com">moi</span>
        <span class="g2" email="nick@attio.com">nick@attio.com</span>
        <span class="g2" email="no-reply@stripe.com">Stripe</span>
        <span class="gD" email="julia@helpscout.com">Julia</span>
      </div>
    `);

    expect(extractGmailSnapshot(document)).toEqual({
      ownEmail: 'me@acme.com',
      subject: 'Partnership',
      contacts: [
        { email: 'julia@helpscout.com', name: 'Julia Martin' },
        { email: 'nick@attio.com', name: null },
      ],
    });
  });
});
