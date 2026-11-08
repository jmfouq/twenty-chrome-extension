import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForReply } from './askAi';
import { type TwentyClient } from './TwentyClient';

const userMessage = { id: 'user-1', role: 'user', createdAt: '2026-11-08T10:00:00Z', parts: [] };

const buildClient = (responses: unknown[]) =>
  ({ metadata: vi.fn().mockImplementation(async () => responses.shift()) }) as unknown as TwentyClient;

describe('waitForReply', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports streamed text, then returns the persisted reply that follows the question', async () => {
    vi.useFakeTimers();

    const client = buildClient([
      {
        chatMessages: [
          {
            id: 'old',
            role: 'assistant',
            createdAt: '2026-11-08T09:00:00Z',
            parts: [{ type: 'text', textContent: 'Ancienne réponse' }],
          },
          userMessage,
        ],
        chatStreamCatchupChunks: {
          chunks: [
            { type: 'text-start', id: 't' },
            { type: 'text-delta', id: 't', delta: 'Erik est ' },
            { type: 'text-delta', id: 't', delta: 'Chief Sales Officer' },
          ],
          error: null,
        },
      },
      {
        chatMessages: [
          userMessage,
          {
            id: 'reply',
            role: 'assistant',
            createdAt: '2026-11-08T10:00:05Z',
            parts: [
              { type: 'tool-find_one_person', textContent: null },
              { type: 'text', textContent: 'Erik est **Chief Sales Officer** chez Wallee.' },
            ],
          },
        ],
        chatStreamCatchupChunks: { chunks: [], error: null },
      },
    ]);
    const onProgress = vi.fn();
    const reply = waitForReply(client, { threadId: 'thread', userMessageId: 'user-1', onProgress });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(reply).resolves.toBe('Erik est **Chief Sales Officer** chez Wallee.');
    expect(onProgress).toHaveBeenCalledWith('Erik est Chief Sales Officer');
  });

  it('surfaces a stream error', async () => {
    vi.useFakeTimers();

    const client = buildClient([
      {
        chatMessages: [userMessage],
        chatStreamCatchupChunks: { chunks: [], error: { message: 'Crédits IA épuisés' } },
      },
    ]);
    const reply = waitForReply(client, { threadId: 'thread', userMessageId: 'user-1', onProgress: vi.fn() });
    const assertion = expect(reply).rejects.toThrow('Crédits IA épuisés');

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});
