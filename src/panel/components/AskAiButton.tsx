import { type AskAiContext } from '../api/askAi';
import { getConversationKey, setConversationOpen, useConversation } from '../api/askAiStore';
import { type TwentyClient } from '../api/TwentyClient';
import { AskAiChat } from './AskAiChat';

type AskAiButtonProps = {
  client: TwentyClient;
  context: AskAiContext;
  contextLabel: string;
};

export const AskAiButton = ({ client, context, contextLabel }: AskAiButtonProps) => {
  const conversationKey = getConversationKey(context);
  const { open } = useConversation(conversationKey);

  if (open) {
    return <AskAiChat client={client} context={context} contextLabel={contextLabel} />;
  }

  return (
    <button
      type="button"
      className="button-secondary ask-ai-button"
      onClick={() => setConversationOpen(conversationKey, true)}
    >
      <img src="/icons/sparkles.svg" alt="" />
      Ask AI
    </button>
  );
};
