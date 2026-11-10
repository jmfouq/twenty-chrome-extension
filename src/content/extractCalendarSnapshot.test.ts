import { describe, expect, it } from 'vitest';
import { extractCalendarSnapshot } from './extractCalendarSnapshot';

const buildDocument = (body: string) =>
  new DOMParser().parseFromString(
    `<body><a aria-label="Compte Google : Jean-Marie (jm@twenty.com)"></a>${body}</body>`,
    'text/html',
  );

describe('extractCalendarSnapshot', () => {
  it('lists the external guests of the open event', () => {
    const document = buildDocument(`
      <div role="main"><div data-email="ignored@other.com">Background</div></div>
      <div role="dialog">
        <span role="heading">30 min meeting with Eric</span>
        <div data-email="jm@twenty.com"><span>Jean-Marie Fouquet</span><span>Organisateur</span></div>
        <div data-email="felix@twenty.com"><span>Félix</span></div>
        <div data-email="eepizzuti@jrwald.com"><span>Eric Pizzuti</span><span>Facultatif</span></div>
        <div data-email="no-reply@zoom.us"><span>Zoom</span></div>
      </div>
    `);

    expect(extractCalendarSnapshot(document)).toEqual({
      ownEmail: 'jm@twenty.com',
      subject: '30 min meeting with Eric',
      contacts: [{ email: 'eepizzuti@jrwald.com', name: 'Eric Pizzuti' }],
      attachments: [],
    });
  });

  it('returns no contacts when no event is open', () => {
    expect(extractCalendarSnapshot(buildDocument('<div role="main"><div>Semaine</div></div>')).contacts).toEqual([]);
  });
});
