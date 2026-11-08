import { type TwentyClient } from './TwentyClient';

export type ReplyProgress = { text: string; toolCallCount: number };

export type AskAiContext = { objectNameSingular: 'person' | 'company' | 'opportunity'; recordId: string };

type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  createdAt: string;
  parts: { type: string; textContent: string | null; errorMessage: string | null }[];
};

type ReplyPollResult = {
  chatMessages: ChatMessage[];
  chatStreamCatchupChunks: { chunks: { type?: string; delta?: string }[]; error: { message: string } | null };
};

const POLL_INTERVAL_MS = 1000;
const REPLY_TIMEOUT_MS = 180_000;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getChatUrl = (client: TwentyClient, threadId: string) => `${client.workspaceUrl}/chat/${threadId}`;

export const createChatThread = async (client: TwentyClient) => {
  const data = await client.metadata<{ createChatThread: { id: string } }>(
    `mutation CreateChatThread { createChatThread { id } }`,
  );

  return data.createChatThread.id;
};

export const sendChatMessage = async (
  client: TwentyClient,
  { threadId, text, context }: { threadId: string; text: string; context: AskAiContext | null },
) => {
  const messageId = crypto.randomUUID();

  await client.metadata(
    `mutation SendChatMessage($threadId: UUID!, $text: String!, $messageId: UUID!, $browsingContext: JSON) {
      sendChatMessage(threadId: $threadId, text: $text, messageId: $messageId, browsingContext: $browsingContext) {
        messageId
      }
    }`,
    {
      threadId,
      text,
      messageId,
      browsingContext: context ? { type: 'recordPage', ...context } : null,
    },
  );

  return messageId;
};

const getTextFromParts = (message: ChatMessage) =>
  message.parts
    .filter((part) => part.type === 'text' && part.textContent)
    .map((part) => part.textContent)
    .join('\n\n');

const getProgress = (chunks: ReplyPollResult['chatStreamCatchupChunks']['chunks']): ReplyProgress => ({
  text: chunks
    .filter((chunk) => chunk.type === 'text-delta' && typeof chunk.delta === 'string')
    .map((chunk) => chunk.delta)
    .join(''),
  toolCallCount: chunks.filter((chunk) => chunk.type === 'tool-input-start').length,
});

// Twenty streams replies over websockets; polling the same catch-up query its front uses keeps the panel simple.
export const waitForReply = async (
  client: TwentyClient,
  {
    threadId,
    userMessageId,
    onProgress,
  }: { threadId: string; userMessageId: string; onProgress: (progress: ReplyProgress) => void },
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < REPLY_TIMEOUT_MS) {
    await wait(POLL_INTERVAL_MS);

    const data = await client.metadata<ReplyPollResult>(
      `query PollChatReply($threadId: UUID!) {
        chatMessages(threadId: $threadId) { id role createdAt parts { type textContent errorMessage } }
        chatStreamCatchupChunks(threadId: $threadId) { chunks error { message } }
      }`,
      { threadId },
    );
    const userMessageIndex = data.chatMessages.findIndex((message) => message.id === userMessageId);
    const reply =
      userMessageIndex >= 0 &&
      data.chatMessages
        .slice(userMessageIndex + 1)
        .find((message) => message.role === 'assistant' && getTextFromParts(message));

    // Twenty saves partial replies while streaming and clears the stream chunks only once the final reply is saved.
    if (reply && data.chatStreamCatchupChunks.chunks.length === 0) {
      return getTextFromParts(reply);
    }

    if (data.chatStreamCatchupChunks.error) {
      throw new Error(data.chatStreamCatchupChunks.error.message);
    }

    onProgress(getProgress(data.chatStreamCatchupChunks.chunks));
  }

  throw new Error("L'IA n'a pas répondu à temps. Retrouve la conversation dans Twenty.");
};

export const toAskAiErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  if (/no ai models|api key is not configured|api_key_not_configured/i.test(message)) {
    return "L'IA n'est pas configurée sur ce workspace Twenty.";
  }

  if (/permission/i.test(message)) {
    return "Ton rôle dans Twenty n'a pas accès à l'IA.";
  }

  return message;
};
