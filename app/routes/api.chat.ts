import { type ActionFunctionArgs } from 'react-router';
import {
  MAX_RESPONSE_SEGMENTS,
  MAX_TOKENS,
  streamText,
  type Messages,
  type AIProvider,
  SwitchableStream,
} from '~/lib/.server/llm';

const CONTINUE_PROMPT =
  'Continue your response from exactly where you left off.';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  console.time('[API_CHAT] Total Request Time');

  try {
    const { messages, provider } = (await request.json()) as {
      messages: Messages;
      provider?: AIProvider;
    };

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[API_CHAT] Invalid messages:', messages);
      return new Response(
        JSON.stringify({
          error: 'Messages array is required and must not be empty',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    console.log('[API_CHAT] Provider:', provider || 'anthropic');
    console.log('[API_CHAT] Message count:', messages.length);

    const stream = new SwitchableStream();

    const options = {
      onFinish: async ({ text: content, finishReason }: any) => {
        console.log('[API_CHAT] Stream finished, reason:', finishReason);

        const hasUnclosedArtifact =
          content.lastIndexOf('<devArtifact') >
          content.lastIndexOf('</devArtifact>');
        const hasUnclosedAction =
          content.lastIndexOf('<devAction') >
          content.lastIndexOf('</devAction>');

        if (
          finishReason !== 'length' &&
          !hasUnclosedArtifact &&
          !hasUnclosedAction
        ) {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(
          `[API_CHAT] Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`,
        );

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        // Get environment variables
        const env = {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          GOOGLE_GENERATIVE_AI_API_KEY:
            process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          OPEN_AI: process.env.OPEN_AI,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        };

        const result = await streamText(
          messages,
          env as any,
          provider,
          options,
        );

        return stream.switchSource(result.toDataStreamResponse().body!);
      },
    };

    console.time('[API_CHAT] Stream Text Init');

    // Get environment variables
    const env = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      OPEN_AI: process.env.OPEN_AI,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };

    const result = await streamText(messages, env as any, provider, options);
    console.timeEnd('[API_CHAT] Stream Text Init');

    stream.switchSource(result.toDataStreamResponse().body!);

    console.timeEnd('[API_CHAT] Total Request Time');

    return new Response(stream.readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('[API_CHAT] Error:', error);

    // Check for specific API errors
    // Extract the most useful message from the error object
    let errorMessage = error?.message || error?.toString() || 'Unknown error';

    try {
      // Try to parse if it's a JSON string
      if (
        typeof errorMessage === 'string' &&
        errorMessage.trim().startsWith('{')
      ) {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;

          // Handle double-encoded JSON in message (common in Google errors)
          if (
            typeof errorMessage === 'string' &&
            errorMessage.trim().startsWith('{')
          ) {
            const innerParsed = JSON.parse(errorMessage);
            if (innerParsed.error?.message) {
              errorMessage = innerParsed.error.message;
            }
          }
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      }
    } catch (e) {
      // If parsing fails, just use the original string
    }

    // Deep fallback: if error object itself has detailed structure
    if (error?.error?.message) {
      errorMessage = error.error.message;
      try {
        if (
          typeof errorMessage === 'string' &&
          errorMessage.trim().startsWith('{')
        ) {
          const innerParsed = JSON.parse(errorMessage);
          if (innerParsed.error?.message) {
            errorMessage = innerParsed.error.message;
          }
        }
      } catch (e) {}
    }

    const isApiKeyError =
      errorMessage.toLowerCase().includes('api key') ||
      errorMessage.toLowerCase().includes('invalid') ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      error?.status === 401 ||
      error?.status === 400;

    const isQuotaError =
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.toLowerCase().includes('limit') ||
      errorMessage.toLowerCase().includes('credit') ||
      errorMessage.toLowerCase().includes('balance') ||
      error?.status === 429;

    if (isApiKeyError || isQuotaError) {
      const userMessage = isQuotaError
        ? `**⚠️ System Alert: Token Limit / Quota Exceeded**\n\nThe API provider has rejected the request due to a quota limit or insufficient balance.\n\n**Reason:** ${errorMessage}\n\n**Action:** Please check your usage limits or add credits to your API provider account found in Settings.`
        : `**⚠️ System Alert: API Key Invalid**\n\nThe API provider rejected the request. It seems your API key is invalid or missing.\n\n**Reason:** ${errorMessage}\n\n**Action:** Please verify your API key in the connection settings.`;

      // Create a stream that mimics the Vercel AI SDK Data Stream Protocol
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // 0: text part
          controller.enqueue(
            encoder.encode(`0:${JSON.stringify(userMessage)}\n`),
          );
          // e: finish part (optional but good practice)
          // controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0,"totalTokens":0}}\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

    return new Response(null, {
      status: 500,
      statusText: error?.message || 'Internal Server Error',
    });
  }
}
