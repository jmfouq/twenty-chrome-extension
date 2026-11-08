import { TwentyApiError } from './TwentyClient';

type FieldSelection = Record<string, string | (() => string)>;

const FIELD_DENIED_PATTERN = /no permission to read field "(\w+)" on "(\w+)"/;
const WRITE_DENIED_PATTERN = /no permission to write field "(\w+)"/;
const MAX_FIELD_RETRIES = 15;

const deniedFieldsByObject = new Map<string, Set<string>>();

const getDeniedFields = (objectNameSingular: string) => {
  let deniedFields = deniedFieldsByObject.get(objectNameSingular);

  if (!deniedFields) {
    deniedFields = new Set();
    deniedFieldsByObject.set(objectNameSingular, deniedFields);
  }

  return deniedFields;
};

export const selectFields = (objectNameSingular: string, fields: FieldSelection): string => {
  const deniedFields = getDeniedFields(objectNameSingular);

  return Object.entries(fields)
    .filter(([fieldName]) => !deniedFields.has(fieldName))
    .map(([, selection]) => (typeof selection === 'function' ? selection() : selection))
    .join('\n');
};

// Workspaces can hide fields per role; drop each denied field and retry so the
// rest of the record still shows. Only use for reads: a retried write could run twice.
export const withReadableFields = async <TResult>(run: () => Promise<TResult>): Promise<TResult> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const match = error instanceof Error ? error.message.match(FIELD_DENIED_PATTERN) : null;

      if (!match || attempt >= MAX_FIELD_RETRIES) {
        throw error;
      }

      getDeniedFields(match[2]).add(match[1]);
    }
  }
};

// Permissions are checked before anything is written, so a create can be retried
// safely without the optional fields the role cannot write.
export const withWritableFields = async <TResult>(
  data: Record<string, unknown>,
  requiredFields: string[],
  run: (data: Record<string, unknown>) => Promise<TResult>,
): Promise<TResult> => {
  const writableData = { ...data };

  for (let attempt = 0; ; attempt++) {
    try {
      return await run(writableData);
    } catch (error) {
      const field = error instanceof TwentyApiError ? error.rawMessage.match(WRITE_DENIED_PATTERN)?.[1] : undefined;

      if (!field || !(field in writableData) || requiredFields.includes(field) || attempt >= MAX_FIELD_RETRIES) {
        throw error;
      }

      delete writableData[field];
    }
  }
};
