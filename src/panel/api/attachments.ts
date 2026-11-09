import {
  type DownloadAttachmentResponse,
  type ExtensionMessage,
  type GmailAttachment,
} from "../../shared/types";
import { withWritableFields } from "./fieldSelection";
import { TwentyApiError, type TwentyClient } from "./TwentyClient";

export type AttachmentTargetKind = "person" | "company" | "opportunity";

export type AttachmentTarget = {
  kind: AttachmentTargetKind;
  id: string;
  label: string;
};

type Connection<TNode> = { edges: { node: TNode }[] };

type FileUploadTarget = {
  fileId: string;
  uploadUrl: string;
  contentType: string;
};

const TARGET_FIELD_BY_KIND: Record<AttachmentTargetKind, string> = {
  person: "targetPersonId",
  company: "targetCompanyId",
  opportunity: "targetOpportunityId",
};

export class UploadBlockedError extends Error {
  constructor(readonly origin: string) {
    super(`Chrome a bloqué l'envoi du fichier vers ${origin}.`);
  }
}

const isFileResponse = (response: Response) =>
  !(response.headers.get("content-type") ?? "").startsWith("text/html");

const downloadFromPanel = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });

  // A Gmail sign-in or error page comes back as HTML instead of the file.
  if (!response.ok || !isFileResponse(response)) {
    throw new Error(`Gmail a répondu ${response.status}.`);
  }

  return response.blob();
};

const downloadFromGmailTab = async (url: string) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("L'onglet Gmail n'est plus ouvert.");
  }

  const response = await chrome.tabs.sendMessage<
    ExtensionMessage,
    DownloadAttachmentResponse
  >(tab.id, {
    type: "downloadAttachment",
    url,
  });

  if ("error" in response) {
    throw new Error(response.error);
  }

  return (await fetch(response.dataUrl)).blob();
};

export const downloadGmailAttachment = async (attachment: GmailAttachment) => {
  let blob: Blob;

  try {
    blob = await downloadFromPanel(attachment.downloadUrl);
  } catch {
    try {
      blob = await downloadFromGmailTab(attachment.downloadUrl);
    } catch (error) {
      throw new Error(
        `Impossible de récupérer « ${attachment.name} » dans Gmail (${error instanceof Error ? error.message : error}).`,
      );
    }
  }

  return new File([blob], attachment.name, {
    type: attachment.mimeType || blob.type,
  });
};

let fileFieldIdPromise: Promise<string> | null = null;

const getAttachmentFileFieldId = (client: TwentyClient) => {
  fileFieldIdPromise ??= requestAttachmentFileFieldId(client).catch(
    (error: unknown) => {
      fileFieldIdPromise = null;
      throw error;
    },
  );

  return fileFieldIdPromise;
};

const requestAttachmentFileFieldId = async (client: TwentyClient) => {
  const data = await client.metadata<{
    objects: Connection<{
      nameSingular: string;
      fields: Connection<{ id: string; name: string; type: string }>;
    }>;
  }>(
    `query AttachmentFileField {
      objects(paging: { first: 200 }) {
        edges { node { nameSingular fields(paging: { first: 200 }) { edges { node { id name type } } } } }
      }
    }`,
  );
  const attachment = data.objects.edges.find(
    (edge) => edge.node.nameSingular === "attachment",
  )?.node;
  const fileField = attachment?.fields.edges.find(
    (edge) => edge.node.name === "file" && edge.node.type === "FILES",
  );

  if (!fileField) {
    throw new TwentyApiError(
      "Ce workspace Twenty n'accepte pas les pièces jointes.",
      "attachment file field missing",
    );
  }

  return fileField.node.id;
};

const putFile = async (file: File, target: FileUploadTarget) => {
  let response: Response;

  try {
    response = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": target.contentType },
      body: file,
    });
  } catch {
    throw new UploadBlockedError(new URL(target.uploadUrl).origin);
  }

  if (!response.ok) {
    throw new Error(`L'envoi du fichier a échoué (${response.status}).`);
  }
};

export const uploadAttachment = async (
  client: TwentyClient,
  file: File,
  target: AttachmentTarget,
) => {
  const fieldMetadataId = await getAttachmentFileFieldId(client);
  const { createFileUpload } = await client.metadata<{
    createFileUpload: FileUploadTarget;
  }>(
    `mutation CreateFileUpload($filename: String!, $size: Float!, $fieldMetadataId: String) {
      createFileUpload(filename: $filename, size: $size, fileFolder: FilesField, fieldMetadataId: $fieldMetadataId) {
        fileId uploadUrl contentType
      }
    }`,
    { filename: file.name, size: file.size, fieldMetadataId },
  );

  await putFile(file, createFileUpload);

  await client.metadata(
    `mutation CompleteFileUpload($fileId: String!) { completeFileUpload(fileId: $fileId) { id } }`,
    { fileId: createFileUpload.fileId },
  );

  await withWritableFields(
    {
      name: file.name,
      [TARGET_FIELD_BY_KIND[target.kind]]: target.id,
      file: [{ fileId: createFileUpload.fileId, label: file.name }],
    },
    ["file", TARGET_FIELD_BY_KIND[target.kind]],
    (data) =>
      client.graphql(
        `mutation CreateAttachment($data: AttachmentCreateInput!) { createAttachment(data: $data) { id } }`,
        {
          data,
        },
      ),
  );
};
