export type DetectedContact = {
  email: string;
  name: string | null;
};

export type GmailAttachment = {
  name: string;
  mimeType: string;
  downloadUrl: string;
  senderName: string | null;
};

export type GmailSnapshot = {
  ownEmail: string | null;
  subject: string | null;
  contacts: DetectedContact[];
  attachments: GmailAttachment[];
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

export type WebsiteSnapshot = {
  url: string;
  domain: string;
  suggestedName: string;
};

export type PageSnapshot =
  | ({ source: 'gmail' } & GmailSnapshot)
  | ({ source: 'calendar' } & GmailSnapshot)
  | ({ source: 'linkedin' } & LinkedinSnapshot)
  | ({ source: 'website' } & WebsiteSnapshot);

export type ExtensionMessage =
  | { type: 'getSnapshot' }
  | { type: 'snapshotChanged'; snapshot: PageSnapshot }
  | { type: 'downloadAttachment'; url: string };

export type DownloadAttachmentResponse = { dataUrl: string } | { error: string };
