export const CHAT_REFERENCE_PATTERN = /(\[\[[a-z]+:[^\]]+\]\])/g;

const IDENTITY_SEGMENT_COUNT_BY_KIND: Record<string, number> = {
  record: 2,
  records: 1,
  object: 1,
  field: 2,
  view: 1,
  role: 1,
  app: 1,
  skill: 1,
};

export type ChatReference = {
  label: string;
  record: { objectNameSingular: string; recordId: string } | null;
};

// Twenty's AI writes references as [[kind:identity...:label]]; the label is everything after the identity.
export const parseChatReference = (token: string): ChatReference | null => {
  const body = token.match(/^\[\[(.+)\]\]$/)?.[1];
  const [kind, ...segments] = body?.split(':') ?? [];
  const identityCount = IDENTITY_SEGMENT_COUNT_BY_KIND[kind ?? ''];

  if (!identityCount || segments.length <= identityCount) {
    return null;
  }

  const label = segments.slice(identityCount).join(':').trim();

  if (!label) {
    return null;
  }

  return {
    label,
    record: kind === 'record' ? { objectNameSingular: segments[0], recordId: segments[1] } : null,
  };
};
