import { useState } from 'react';
import { type AskAiContext } from '../api/askAi';
import { type TwentyClient } from '../api/TwentyClient';
import { AskAiChat } from './AskAiChat';

type AskAiButtonProps = {
  client: TwentyClient;
  context: AskAiContext;
  contextLabel: string;
};

export const AskAiButton = ({ client, context, contextLabel }: AskAiButtonProps) => {
  const [open, setOpen] = useState(false);

  if (open) {
    return <AskAiChat client={client} context={context} contextLabel={contextLabel} onClose={() => setOpen(false)} />;
  }

  return (
    <button type="button" className="button-secondary ask-ai-button" onClick={() => setOpen(true)}>
      <img src="/icons/sparkles.svg" alt="" />
      Ask AI
    </button>
  );
};
