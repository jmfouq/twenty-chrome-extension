import { useState, type KeyboardEvent } from 'react';
import { type AskAiContext, type ReplyProgress, getChatUrl } from '../api/askAi';
import {
  askQuestion,
  getConversationKey,
  resetConversation,
  setConversationOpen,
  useConversation,
} from '../api/askAiStore';
import { type TwentyClient } from '../api/TwentyClient';
import { RichText } from './RichText';

type AskAiChatProps = {
  client: TwentyClient;
  context: AskAiContext | null;
  contextLabel: string | null;
};

const getActivityLabel = ({ toolCallCount }: ReplyProgress) =>
  toolCallCount === 0
    ? 'Réflexion en cours…'
    : `Recherche dans Twenty (${toolCallCount} ${toolCallCount > 1 ? 'étapes' : 'étape'})…`;

export const AskAiChat = ({ client, context, contextLabel }: AskAiChatProps) => {
  const conversationKey = getConversationKey(context);
  const { threadId, entries, progress } = useConversation(conversationKey);
  const [draft, setDraft] = useState('');
  const isWaiting = progress !== null;

  const ask = () => {
    const question = draft.trim();

    if (!question || isWaiting) {
      return;
    }

    setDraft('');
    void askQuestion(client, { key: conversationKey, context, question });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask();
    }
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
            <button type="button" className="button-ghost" onClick={() => resetConversation(conversationKey)}>
              Nouvelle
            </button>
          )}
          <button type="button" className="button-ghost" aria-label="Fermer" onClick={() => setConversationOpen(conversationKey, false)}>
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
            {entry.role === 'assistant' ? <RichText text={entry.text} workspaceUrl={client.workspaceUrl} /> : entry.text}
          </div>
        ))}
        {isWaiting && (
          <div className="ask-ai-message ask-ai-message-assistant">
            {progress.text ? (
              <RichText text={progress.text} workspaceUrl={client.workspaceUrl} />
            ) : (
              <span className="muted">{getActivityLabel(progress)}</span>
            )}
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
          onClick={ask}
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
