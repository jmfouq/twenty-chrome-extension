import { useState, type KeyboardEvent } from 'react';
import {
  type AskAiContext,
  createChatThread,
  getChatUrl,
  sendChatMessage,
  toAskAiErrorMessage,
  waitForReply,
} from '../api/askAi';
import { type TwentyClient } from '../api/TwentyClient';
import { RichText } from './RichText';

type AskAiChatProps = {
  client: TwentyClient;
  context: AskAiContext | null;
  contextLabel: string | null;
  onClose: () => void;
};

type ChatEntry = { id: string; role: 'user' | 'assistant' | 'error'; text: string };

export const AskAiChat = ({ client, context, contextLabel, onClose }: AskAiChatProps) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingReply, setPendingReply] = useState<string | null>(null);
  const isWaiting = pendingReply !== null;

  const ask = async () => {
    const question = draft.trim();

    if (!question || isWaiting) {
      return;
    }

    setDraft('');
    setEntries((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', text: question }]);
    setPendingReply('');

    try {
      const currentThreadId = threadId ?? (await createChatThread(client));

      setThreadId(currentThreadId);

      const userMessageId = await sendChatMessage(client, { threadId: currentThreadId, text: question, context });
      const reply = await waitForReply(client, {
        threadId: currentThreadId,
        userMessageId,
        onProgress: setPendingReply,
      });

      setEntries((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: reply }]);
    } catch (error) {
      setEntries((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'error', text: toAskAiErrorMessage(error) },
      ]);
    } finally {
      setPendingReply(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  };

  const startNewConversation = () => {
    setThreadId(null);
    setEntries([]);
  };

  return (
    <section className="ask-ai">
      <div className="ask-ai-header">
        <span className="ask-ai-title">
          <img src="/icons/sparkles.svg" alt="" />
          Ask AI{contextLabel ? ` · ${contextLabel}` : ''}
        </span>
        <span className="ask-ai-actions">
          {entries.length > 0 && !isWaiting && (
            <button type="button" className="button-ghost" onClick={startNewConversation}>
              Nouvelle
            </button>
          )}
          <button type="button" className="button-ghost" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </span>
      </div>

      {entries.length === 0 && !isWaiting && (
        <p className="muted">
          {contextLabel
            ? `Pose une question sur ${contextLabel}, ou sur n'importe quelle donnée de Twenty.`
            : "Pose une question sur n'importe quelle donnée de Twenty."}
        </p>
      )}

      <div className="ask-ai-messages">
        {entries.map((entry) => (
          <div key={entry.id} className={`ask-ai-message ask-ai-message-${entry.role}`}>
            {entry.role === 'assistant' ? <RichText text={entry.text} /> : entry.text}
          </div>
        ))}
        {isWaiting && (
          <div className="ask-ai-message ask-ai-message-assistant">
            {pendingReply ? <RichText text={pendingReply} /> : <span className="muted">Réflexion en cours…</span>}
          </div>
        )}
      </div>

      <div className="ask-ai-input">
        <textarea
          rows={2}
          placeholder="Écris ta question…"
          value={draft}
          disabled={isWaiting}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="button-primary"
          disabled={isWaiting || !draft.trim()}
          onClick={() => void ask()}
        >
          Envoyer
        </button>
      </div>

      {threadId && (
        <a className="open-link" href={getChatUrl(client, threadId)} target="_blank" rel="noreferrer">
          Continuer dans Twenty ↗
        </a>
      )}
    </section>
  );
};
