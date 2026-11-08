export type Person = {
  id: string;
  name?: { firstName: string; lastName: string } | null;
  emails?: { primaryEmail: string | null; additionalEmails: string[] | null } | null;
  jobTitle?: string | null;
  phones?: {
    primaryPhoneNumber: string | null;
    primaryPhoneCallingCode: string | null;
  } | null;
  linkedinLink?: { primaryLinkUrl: string | null } | null;
  avatarUrl?: string | null;
  companyId?: string | null;
  company?: { id: string; name: string | null } | null;
};

export type Company = {
  id: string;
  name?: string | null;
  domainName?: { primaryLinkUrl: string | null } | null;
  linkedinLink?: { primaryLinkUrl: string | null } | null;
  accountOwner?: { name: { firstName: string; lastName: string } | null } | null;
};

export type Opportunity = {
  id: string;
  name: string | null;
  stage: string | null;
  closeDate: string | null;
  amount: { amountMicros: number | null; currencyCode: string | null } | null;
  pointOfContactId: string | null;
  companyId: string | null;
};

export type ActivityItem = {
  id: string;
  kind: 'note' | 'task';
  title: string | null;
  createdAt: string;
  status?: string | null;
  dueAt?: string | null;
};

export type ActivityTarget = { personId: string } | { companyId: string } | { opportunityId: string };

export type SelectOption = { value: string; label: string };
