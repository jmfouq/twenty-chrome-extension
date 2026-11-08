import { describe, expect, it } from 'vitest';
import { parseChatReference } from './chatReferences';

describe('parseChatReference', () => {
  it('reads a record reference', () => {
    expect(
      parseChatReference('[[record:calendarEventParticipant:cf1cf46b-7657-41bd-8aba-673165415ae9:erik@wallee.com]]'),
    ).toEqual({
      label: 'erik@wallee.com',
      record: { objectNameSingular: 'calendarEventParticipant', recordId: 'cf1cf46b-7657-41bd-8aba-673165415ae9' },
    });
  });

  it('keeps colons in the label', () => {
    expect(parseChatReference('[[record:calendarEvent:08b09e4e-00bf-4e5d-ad57-f957224dab2d:Démo : mardi]]')?.label).toBe(
      'Démo : mardi',
    );
  });

  it('reads non-record references as plain labels', () => {
    expect(parseChatReference('[[field:company:domainName:Domain name]]')).toEqual({
      label: 'Domain name',
      record: null,
    });
  });

  it('ignores unknown or malformed references', () => {
    expect(parseChatReference('[[foo:bar:baz]]')).toBeNull();
    expect(parseChatReference('[[record:company:abc]]')).toBeNull();
  });
});
