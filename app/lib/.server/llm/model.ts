import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

export function getAnthropicModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic('claude-sonnet-4-5-20250929');
}

export function getOpenAIModel(apiKey: string) {
  const openai = createOpenAI({
    apiKey,
  });

  return openai('gpt-4o');
}
