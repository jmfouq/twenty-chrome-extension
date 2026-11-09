import { normalizeDomain } from '../../shared/emailDomains';
import { isSameLinkedinUrl, parseLinkedinUrl } from '../../shared/linkedinUrl';
import { selectFields, withReadableFields, withWritableFields } from './fieldSelection';
import { TwentyApiError, type TwentyClient } from './TwentyClient';
import {
  type ActivityItem,
  type ActivityTarget,
  type Company,
  type Opportunity,
  type Person,
  type SelectOption,
} from './types';

type Connection<TNode> = { edges: { node: TNode }[] };

const personFields = () =>
  selectFields('person', {
    id: 'id',
    name: 'name { firstName lastName }',
    emails: 'emails { primaryEmail additionalEmails }',
    jobTitle: 'jobTitle',
    phones: 'phones { primaryPhoneNumber primaryPhoneCallingCode }',
    linkedinLink: 'linkedinLink { primaryLinkUrl }',
    avatarUrl: 'avatarUrl',
    companyId: 'companyId',
    company: () => `company { ${selectFields('company', { id: 'id', name: 'name' })} }`,
  });

const companyFields = () =>
  selectFields('company', {
    id: 'id',
    name: 'name',
    domainName: 'domainName { primaryLinkUrl }',
    linkedinLink: 'linkedinLink { primaryLinkUrl }',
    accountOwner: () => `accountOwner { ${selectFields('workspaceMember', { name: 'name { firstName lastName }' })} }`,
  });

const opportunityFields = () =>
  selectFields('opportunity', {
    id: 'id',
    name: 'name',
    stage: 'stage',
    closeDate: 'closeDate',
    amount: 'amount { amountMicros currencyCode }',
    pointOfContactId: 'pointOfContactId',
    companyId: 'companyId',
  });

const nodes = <TNode>(connection: Connection<TNode>) => connection.edges.map((edge) => edge.node);

const getPersonEmails = (person: Person) =>
  [person.emails?.primaryEmail, ...(person.emails?.additionalEmails ?? [])]
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

export const findPeopleByEmails = async (client: TwentyClient, emails: string[]) => {
  if (emails.length === 0) {
    return new Map<string, Person>();
  }

  const data = await withReadableFields(() =>
    client.graphql<{ people: Connection<Person> }>(
      `query FindPeopleByEmails($filter: PersonFilterInput) {
        people(filter: $filter, first: 100) { edges { node { ${personFields()} } } }
      }`,
      {
        filter: {
          or: emails.flatMap((email) => [
            { emails: { primaryEmail: { ilike: email } } },
            { emails: { additionalEmails: { ilike: `%${email}%` } } },
          ]),
        },
      },
    ),
  );
  const peopleByEmail = new Map<string, Person>();

  nodes(data.people).forEach((person) => {
    getPersonEmails(person)
      .filter((email) => emails.includes(email) && !peopleByEmail.has(email))
      .forEach((email) => peopleByEmail.set(email, person));
  });

  return peopleByEmail;
};

export const findCompaniesByDomains = async (client: TwentyClient, domains: string[]) => {
  if (domains.length === 0) {
    return new Map<string, Company>();
  }

  const data = await withReadableFields(() =>
    client.graphql<{ companies: Connection<Company> }>(
      `query FindCompaniesByDomains($filter: CompanyFilterInput) {
        companies(filter: $filter, first: 100) { edges { node { ${companyFields()} } } }
      }`,
      {
        filter: {
          or: domains.map((domain) => ({ domainName: { primaryLinkUrl: { ilike: `%${domain}%` } } })),
        },
      },
    ),
  );
  const companiesByDomain = new Map<string, Company>();

  nodes(data.companies).forEach((company) => {
    const domain = normalizeDomain(company.domainName?.primaryLinkUrl ?? '');

    if (domain && domains.includes(domain) && !companiesByDomain.has(domain)) {
      companiesByDomain.set(domain, company);
    }
  });

  return companiesByDomain;
};

export const findOpportunities = async (
  client: TwentyClient,
  { personIds, companyIds }: { personIds: string[]; companyIds: string[] },
) => {
  const or = [
    ...(personIds.length > 0 ? [{ pointOfContactId: { in: personIds } }] : []),
    ...(companyIds.length > 0 ? [{ companyId: { in: companyIds } }] : []),
  ];

  if (or.length === 0) {
    return [];
  }

  const data = await withReadableFields(() =>
    client.graphql<{ opportunities: Connection<Opportunity> }>(
      `query FindOpportunities($filter: OpportunityFilterInput) {
        opportunities(filter: $filter, first: 50, orderBy: [{ closeDate: AscNullsLast }]) {
          edges { node { ${opportunityFields()} } }
        }
      }`,
      { filter: { or } },
    ),
  );

  return nodes(data.opportunities);
};

const getLinkedinFilter = (url: string) => {
  const key = parseLinkedinUrl(url);

  if (!key) {
    return null;
  }

  const pathSegment = key.kind === 'person' ? 'in' : 'company';
  const slugs = [...new Set([key.slug, encodeURIComponent(key.slug)])];
  const patterns = slugs.flatMap((slug) => ['', '/', '/%', '?%'].map((suffix) => `%/${pathSegment}/${slug}${suffix}`));

  return { or: patterns.map((pattern) => ({ linkedinLink: { primaryLinkUrl: { ilike: pattern } } })) };
};

const findPeople = async (client: TwentyClient, filter: Record<string, unknown>) => {
  const data = await withReadableFields(() =>
    client.graphql<{ people: Connection<Person> }>(
      `query FindPeople($filter: PersonFilterInput) {
        people(filter: $filter, first: 20) { edges { node { ${personFields()} } } }
      }`,
      { filter },
    ),
  );

  return nodes(data.people);
};

const findCompanies = async (client: TwentyClient, filter: Record<string, unknown>) => {
  const data = await withReadableFields(() =>
    client.graphql<{ companies: Connection<Company> }>(
      `query FindCompanies($filter: CompanyFilterInput) {
        companies(filter: $filter, first: 20) { edges { node { ${companyFields()} } } }
      }`,
      { filter },
    ),
  );

  return nodes(data.companies);
};

// Roles that cannot read linkedinLink cannot filter on it either; fall back to other lookups.
const nullWhenLinkedinHidden = async <TResult>(run: () => Promise<TResult>) => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TwentyApiError && /permission/i.test(error.rawMessage)) {
      return null;
    }

    throw error;
  }
};

export const findPersonByLinkedinUrl = async (client: TwentyClient, url: string) => {
  const filter = getLinkedinFilter(url);

  if (!filter) {
    return null;
  }

  const people = await nullWhenLinkedinHidden(() => findPeople(client, filter));

  if (!people) {
    return null;
  }

  return people.find((person) => isSameLinkedinUrl(person.linkedinLink?.primaryLinkUrl, url)) ?? null;
};

export const findPeopleByName = (client: TwentyClient, name: { firstName: string; lastName: string }) =>
  findPeople(client, {
    and: [{ name: { firstName: { ilike: name.firstName } } }, { name: { lastName: { ilike: name.lastName } } }],
  });

export const findCompanyByLinkedinUrl = async (client: TwentyClient, url: string) => {
  const filter = getLinkedinFilter(url);

  if (!filter) {
    return null;
  }

  const companies = await nullWhenLinkedinHidden(() => findCompanies(client, filter));

  if (!companies) {
    return null;
  }

  return companies.find((company) => isSameLinkedinUrl(company.linkedinLink?.primaryLinkUrl, url)) ?? null;
};

export const findCompaniesByName = (client: TwentyClient, name: string) =>
  findCompanies(client, { name: { ilike: name } });

export const findPersonById = async (client: TwentyClient, id: string) => {
  const data = await withReadableFields(() =>
    client.graphql<{ person: Person }>(
      `query FindPerson($id: UUID!) { person(filter: { id: { eq: $id } }) { ${personFields()} } }`,
      { id },
    ),
  );

  return data.person;
};

export const findCompanyById = async (client: TwentyClient, id: string) => {
  const data = await withReadableFields(() =>
    client.graphql<{ company: Company }>(
      `query FindCompany($id: UUID!) { company(filter: { id: { eq: $id } }) { ${companyFields()} } }`,
      { id },
    ),
  );

  return data.company;
};

export const createPerson = async (
  client: TwentyClient,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    jobTitle?: string | null;
    linkedinUrl?: string;
    companyId: string | null;
  },
) => {
  const data = await withWritableFields(
    {
      name: { firstName: input.firstName, lastName: input.lastName },
      companyId: input.companyId,
      ...(input.email && { emails: { primaryEmail: input.email } }),
      ...(input.jobTitle && { jobTitle: input.jobTitle }),
      ...(input.linkedinUrl && { linkedinLink: { primaryLinkUrl: input.linkedinUrl } }),
    },
    ['name'],
    (writableData) =>
      client.graphql<{ createPerson: { id: string } }>(
        `mutation CreatePerson($data: PersonCreateInput!) { createPerson(data: $data) { id } }`,
        { data: writableData },
      ),
  );

  return findPersonById(client, data.createPerson.id);
};

export const updatePerson = async (client: TwentyClient, id: string, data: Record<string, unknown>) => {
  await client.graphql(
    `mutation UpdatePerson($id: UUID!, $data: PersonUpdateInput!) { updatePerson(id: $id, data: $data) { id } }`,
    { id, data },
  );

  return findPersonById(client, id);
};

export const createCompany = async (
  client: TwentyClient,
  input: { name: string; domain?: string | null; linkedinUrl?: string | null },
) => {
  const data = await withWritableFields(
    {
      name: input.name,
      ...(input.domain && { domainName: { primaryLinkUrl: `https://${input.domain}` } }),
      ...(input.linkedinUrl && { linkedinLink: { primaryLinkUrl: input.linkedinUrl } }),
    },
    ['name'],
    (writableData) =>
      client.graphql<{ createCompany: { id: string } }>(
        `mutation CreateCompany($data: CompanyCreateInput!) { createCompany(data: $data) { id } }`,
        { data: writableData },
      ),
  );

  return findCompanyById(client, data.createCompany.id);
};

export const updateCompany = async (client: TwentyClient, id: string, data: Record<string, unknown>) => {
  await client.graphql(
    `mutation UpdateCompany($id: UUID!, $data: CompanyUpdateInput!) { updateCompany(id: $id, data: $data) { id } }`,
    { id, data },
  );

  return findCompanyById(client, id);
};

const toTargetData = (target: ActivityTarget) => {
  if ('personId' in target) {
    return { targetPersonId: target.personId };
  }

  return 'companyId' in target ? { targetCompanyId: target.companyId } : { targetOpportunityId: target.opportunityId };
};

const toTargetFilter = (target: ActivityTarget) =>
  Object.fromEntries(Object.entries(toTargetData(target)).map(([field, id]) => [field, { eq: id }]));

export const findActivities = async (client: TwentyClient, target: ActivityTarget) => {
  const data = await withReadableFields(() =>
    client.graphql<{
      noteTargets: Connection<{ note: Omit<ActivityItem, 'kind'> | null }>;
      taskTargets: Connection<{ task: Omit<ActivityItem, 'kind'> | null }>;
    }>(
      `query FindActivities($filter: NoteTargetFilterInput, $taskFilter: TaskTargetFilterInput) {
      noteTargets(filter: $filter, first: 10, orderBy: [{ createdAt: DescNullsLast }]) {
        edges { node { note { id title createdAt } } }
      }
      taskTargets(filter: $taskFilter, first: 10, orderBy: [{ createdAt: DescNullsLast }]) {
        edges { node { task { id title createdAt status dueAt } } }
      }
    }`,
      { filter: toTargetFilter(target), taskFilter: toTargetFilter(target) },
    ),
  );
  const notes: ActivityItem[] = nodes(data.noteTargets).flatMap(({ note }) =>
    note ? [{ ...note, kind: 'note' as const }] : [],
  );
  const tasks: ActivityItem[] = nodes(data.taskTargets).flatMap(({ task }) =>
    task ? [{ ...task, kind: 'task' as const }] : [],
  );

  return [...tasks, ...notes].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
};

export const createNote = async (
  client: TwentyClient,
  target: ActivityTarget,
  input: { title: string; body: string },
) => {
  const data = await client.graphql<{ createNote: { id: string } }>(
    `mutation CreateNote($data: NoteCreateInput!) { createNote(data: $data) { id } }`,
    { data: { title: input.title, bodyV2: { markdown: input.body } } },
  );

  await client.graphql(
    `mutation CreateNoteTarget($data: NoteTargetCreateInput!) { createNoteTarget(data: $data) { id } }`,
    { data: { noteId: data.createNote.id, ...toTargetData(target) } },
  );
};

export const createTask = async (
  client: TwentyClient,
  target: ActivityTarget,
  input: { title: string; body: string; dueAt: string | null },
) => {
  const data = await client.graphql<{ createTask: { id: string } }>(
    `mutation CreateTask($data: TaskCreateInput!) { createTask(data: $data) { id } }`,
    {
      data: {
        title: input.title,
        bodyV2: { markdown: input.body },
        dueAt: input.dueAt,
      },
    },
  );

  await client.graphql(
    `mutation CreateTaskTarget($data: TaskTargetCreateInput!) { createTaskTarget(data: $data) { id } }`,
    { data: { taskId: data.createTask.id, ...toTargetData(target) } },
  );
};

const findOpportunityById = async (client: TwentyClient, id: string) => {
  const data = await withReadableFields(() =>
    client.graphql<{ opportunity: Opportunity }>(
      `query FindOpportunity($id: UUID!) { opportunity(filter: { id: { eq: $id } }) { ${opportunityFields()} } }`,
      { id },
    ),
  );

  return data.opportunity;
};

export const updateOpportunity = async (client: TwentyClient, id: string, data: Record<string, unknown>) => {
  await client.graphql(
    `mutation UpdateOpportunity($id: UUID!, $data: OpportunityUpdateInput!) { updateOpportunity(id: $id, data: $data) { id } }`,
    { id, data },
  );

  return findOpportunityById(client, id);
};

type FieldMetadataNode = { name: string; options: SelectOption[] | null };

let stageOptionsPromise: Promise<SelectOption[]> | null = null;

// Stage labels are workspace settings, so they come from the metadata API once per panel session.
export const getOpportunityStageOptions = (client: TwentyClient) => {
  stageOptionsPromise ??= requestOpportunityStageOptions(client).catch(() => {
    stageOptionsPromise = null;

    return [];
  });

  return stageOptionsPromise;
};

const requestOpportunityStageOptions = async (client: TwentyClient) => {
  const data = await client.metadata<{
    objects: Connection<{ nameSingular: string; fields: Connection<FieldMetadataNode> }>;
  }>(
    `query OpportunityStageOptions {
      objects(paging: { first: 200 }) {
        edges { node { nameSingular fields(paging: { first: 200 }) { edges { node { name options } } } } }
      }
    }`,
  );
  const opportunity = nodes(data.objects).find((object) => object.nameSingular === 'opportunity');
  const stage = opportunity ? nodes(opportunity.fields).find((field) => field.name === 'stage') : undefined;

  return (stage?.options ?? []).map(({ value, label }) => ({ value, label }));
};

const findOpportunitiesByName = async (client: TwentyClient, pattern: string) => {
  const data = await withReadableFields(() =>
    client.graphql<{ opportunities: Connection<Opportunity> }>(
      `query SearchOpportunities($filter: OpportunityFilterInput) {
        opportunities(filter: $filter, first: 10) { edges { node { ${opportunityFields()} } } }
      }`,
      { filter: { name: { ilike: pattern } } },
    ),
  );

  return nodes(data.opportunities);
};

export const searchRecordsByName = async (client: TwentyClient, query: string) => {
  const pattern = `%${query.trim()}%`;
  const [people, companies, opportunities] = await Promise.all([
    findPeople(client, {
      or: [{ name: { firstName: { ilike: pattern } } }, { name: { lastName: { ilike: pattern } } }],
    }),
    findCompanies(client, { name: { ilike: pattern } }),
    findOpportunitiesByName(client, pattern),
  ]);

  return { people, companies, opportunities };
};
