export type DetectedContact = {
  email: string;
  name: string | null;
};

export type GmailSnapshot = {
  ownEmail: string | null;
  subject: string | null;
  contacts: DetectedContact[];
};

export type LinkedinPersonPage = {
  kind: 'person';
  profileUrl: string;
  fullName: string;
  headline: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyUrl: string | null;
  photoUrl: string | null;
};

export type LinkedinCompanyPage = {
  kind: 'company';
  companyUrl: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
};

export type LinkedinSnapshot = {
  page: LinkedinPersonPage | LinkedinCompanyPage | null;
};

export type PageSnapshot = ({ source: 'gmail' } & GmailSnapshot) | ({ source: 'linkedin' } & LinkedinSnapshot);

export type ExtensionMessage = { type: 'getSnapshot' } | { type: 'snapshotChanged'; snapshot: PageSnapshot };
