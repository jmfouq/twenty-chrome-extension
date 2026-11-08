import { type TwentyClient } from './TwentyClient';

export type EnrichmentOutcome = { status: 'matched' | 'not-found'; message: string };

const TOOL_NAMES = { person: 'app_enrich_person', company: 'app_enrich_company' } as const;
const FILL_EMPTY_FIELDS_ONLY = "Yes and don't overwrite";

const findEnrichResult = (value: unknown): { status?: string; message?: string } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if ('status' in value && typeof value.status === 'string') {
    return value as { status: string; message?: string };
  }

  for (const child of Object.values(value)) {
    const found = findEnrichResult(child);

    if (found) {
      return found;
    }
  }

  return null;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const enrichWithPeopleDataLabs = async (
  client: TwentyClient,
  objectNameSingular: 'person' | 'company',
  recordId: string,
): Promise<EnrichmentOutcome> => {
  const result = await client.callTool(TOOL_NAMES[objectNameSingular], {
    recordId,
    updateFields: FILL_EMPTY_FIELDS_ONLY,
  });
  const text = result.content?.map((part) => part.text ?? '').join('\n') ?? '';
  const parsed = parseJson(text) as { error?: unknown; message?: unknown } | null;
  const enrichResult = findEnrichResult(parsed);

  if (enrichResult?.status === 'MATCHED') {
    return { status: 'matched', message: 'Fiche enrichie par People Data Labs.' };
  }

  if (enrichResult?.status === 'NOT_FOUND') {
    return { status: 'not-found', message: "People Data Labs n'a pas trouvé de correspondance." };
  }

  if (/not (found|available)|unknown tool|does not exist/i.test(text) && !enrichResult) {
    throw new Error("L'enrichissement People Data Labs n'est pas activé sur ce workspace.");
  }

  const parsedMessage = [parsed?.error, parsed?.message].find((value) => typeof value === 'string');

  throw new Error(
    enrichResult?.message ||
      (parsedMessage as string | undefined) ||
      text ||
      "L'enrichissement People Data Labs a échoué.",
  );
};
