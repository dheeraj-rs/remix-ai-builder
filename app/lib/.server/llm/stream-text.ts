// @ts-nocheck
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey, getGoogleAPIKey, getOpenAIKey } from './api-key';
import { getAnthropicModel, getOpenAIModel } from './model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';
import { GoogleGenAI } from '@google/genai';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export type AIProvider = 'anthropic' | 'google' | 'openai';

interface Env {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  OPEN_AI?: string;
  OPENAI_API_KEY?: string;
}

export async function streamText(
  messages: Messages,
  env: Env,
  provider: AIProvider = 'anthropic',
  options?: StreamingOptions,
) {
  if (provider === 'google') {
    const apiKey = getGoogleAPIKey(env);
    const ai = new GoogleGenAI({ apiKey });

    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const googleResult = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        maxOutputTokens: MAX_TOKENS,
        systemInstruction: getSystemPrompt(),
      },
    });

    let fullText = '';

    return {
      toDataStreamResponse: () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of googleResult) {
                const text = chunk.text;
                if (text) {
                  fullText += text;
                  controller.enqueue(
                    encoder.encode(`0:${JSON.stringify(text)}\n`),
                  );
                }
              }
              controller.close();

              if (options?.onFinish) {
                await options.onFinish({
                  text: fullText,
                  finishReason: 'stop',
                  usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  },
                } as any);
              }
            } catch (error) {
              console.error('Google streaming error:', error);
              controller.error(error);
            }
          },
        });
        return new Response(stream);
      },
    };
  }

  let model;

  if (provider === 'openai') {
    const apiKey = getOpenAIKey(env);
    model = getOpenAIModel(apiKey || '');
  } else {
    const apiKey = getAPIKey(env);
    model = getAnthropicModel(apiKey || '');
  }
  const { prompt, ...restOptions } = options || {};

  const result = await _streamText({
    model,
    system: getSystemPrompt(),
    messages: convertToCoreMessages(messages as any),
    ...restOptions,
  });

  return result;
}
