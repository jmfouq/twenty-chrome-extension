import { useSyncExternalStore } from 'react';
import {
  type AskAiContext,
  type ReplyProgress,
  createChatThread,
  sendChatMessage,
  toAskAiErrorMessage,
  waitForReply,
} from './askAi';
import { type TwentyClient } from './TwentyClient';

export type ChatEntry = { id: string; role: 'user' | 'assistant' | 'error'; text: string };

export type Conversation = {
  open: boolean;
  threadId: string | null;
  entries: ChatEntry[];
  progress: ReplyProgress | null;
};

const EMPTY_CONVERSATION: Conversation = { open: false, threadId: null, entries: [], progress: null };

// Lives at module level so a reply keeps loading, and stays visible, while the panel shows another tab.
const conversations = new Map<string, Conversation>();
const listeners = new Set<() => void>();

export const GENERAL_CONVERSATION_KEY = 'general';

export const getConversationKey = (context: AskAiContext | null) =>
  context ? `${context.objectNameSingular}:${context.recordId}` : GENERAL_CONVERSATION_KEY;

const getConversation = (key: string) => conversations.get(key) ?? EMPTY_CONVERSATION;

const updateConversation = (key: string, update: (conversation: Conversation) => Partial<Conversation>) => {
  const conversation = getConversation(key);

  conversations.set(key, { ...conversation, ...update(conversation) });
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

export const useConversation = (key: string) => useSyncExternalStore(subscribe, () => getConversation(key));

export const isConversationOpen = (context: AskAiContext) => getConversation(getConversationKey(context)).open;

export const setConversationOpen = (key: string, open: boolean) => updateConversation(key, () => ({ open }));

export const resetConversation = (key: string) =>
  updateConversation(key, () => ({ threadId: null, entries: [], progress: null }));

const addEntry = (key: string, role: ChatEntry['role'], text: string) =>
  updateConversation(key, (conversation) => ({
    entries: [...conversation.entries, { id: crypto.randomUUID(), role, text }],
  }));

export const askQuestion = async (
  client: TwentyClient,
  { key, context, question }: { key: string; context: AskAiContext | null; question: string },
) => {
  if (getConversation(key).progress) {
    return;
  }

  addEntry(key, 'user', question);
  updateConversation(key, () => ({ progress: { text: '', toolCallCount: 0 } }));

  try {
    const threadId = getConversation(key).threadId ?? (await createChatThread(client));

    updateConversation(key, () => ({ threadId }));

    const userMessageId = await sendChatMessage(client, { threadId, text: question, context });
    const reply = await waitForReply(client, {
      threadId,
      userMessageId,
      onProgress: (progress) => updateConversation(key, () => ({ progress })),
    });

    addEntry(key, 'assistant', reply);
  } catch (error) {
    addEntry(key, 'error', toAskAiErrorMessage(error));
  } finally {
    updateConversation(key, () => ({ progress: null }));
  }
};
