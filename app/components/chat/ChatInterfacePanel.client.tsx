import { Icon } from '@iconify/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import {
  useMessageParser,
  usePromptEnhancer,
  useShortcuts,
  useSnapScroll,
} from '../../hooks';
import {
  useChatStore,
  useWorkbenchStore,
  useTerminalStore,
} from '../../stores/zustand';
import { workbenchStore } from '../../stores/workbench';
import { fileModificationsToHTML } from '../../utils/diff';
import { cubicEasingFn } from '../../utils/easings';
import { createScopedLogger, renderLogger } from '../../utils/logger';
import type { ModelProvider } from './ChatModelSelector';
import { useChatHistory } from '../../lib/persistence';
import ChatInterface from './ChatInterface';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function ChatInterfacePanel() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, urlId } =
    useChatHistory();
  const [conversationKey, setConversationKey] = useState<string | undefined>(
    urlId,
  );
  const prevUrlIdRef = useRef<string | undefined>(urlId);

  useEffect(() => {
    const prevId = prevUrlIdRef.current;
    const currId = urlId;

    if (prevId !== currId) {
      if (prevId === undefined && currId !== undefined) {
        // Keep the old key (undefined) to keep the component alive and avoid aborting the stream
      } else {
        setConversationKey(currId);
      }
      prevUrlIdRef.current = currId;
    }
  }, [urlId]);

  return (
    <>
      {ready && (
        <ChatImpl
          key={conversationKey}
          initialMessages={initialMessages}
          storeMessageHistory={storeMessageHistory}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <Icon icon="ph:x" className="text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          switch (type) {
            case 'success': {
              return (
                <Icon
                  icon="ph:check-bold"
                  className="text-2xl text-green-500"
                />
              );
            }
            case 'error': {
              return (
                <Icon
                  icon="ph:warning-circle-bold"
                  className="text-2xl text-red-500"
                />
              );
            }
          }

          return undefined;
        }}
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={toastAnimation}
      />
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
}

export const ChatImpl = memo(
  ({ initialMessages, storeMessageHistory }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const showChat = useChatStore((state) => state.showChat);
    const selectedProvider = useChatStore((state) => state.selectedProvider);
    const setStarted = useChatStore((state) => state.setStarted);
    const setAborted = useChatStore((state) => state.setAborted);
    const setSelectedProvider = useChatStore(
      (state) => state.setSelectedProvider,
    );
    const setShowHistory = useChatStore((state) => state.setShowHistory);
    const storedMessages = useChatStore((state) => state.messages);
    const storedStarted = useChatStore((state) => state.started);
    const setStoreMessages = useChatStore((state) => state.setMessages);
    const setIsLoading = useChatStore((state) => state.setIsLoading);

    const effectiveInitialMessages = initialMessages;

    const [chatStarted, setChatStarted] = useState(
      effectiveInitialMessages.length > 0,
    );

    const prevMessagesRef = useRef<Message[]>([]);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('selected_ai_provider_v2');
        if (saved) {
          setSelectedProvider(saved as ModelProvider);
        }
      }
    }, [setSelectedProvider]);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_ai_provider_v2', selectedProvider);
      }
    }, [selectedProvider]);

    const [animationScope, animate] = useAnimate();

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
    } = useChat({
      api: '/api/ai-website-builder',
      body: {
        provider: selectedProvider,
      },
      onError: (error) => {
        logger.error('Request failed\n\n', error);
        toast.error('There was an error processing your request');
      },
      onFinish: () => {
        logger.debug('Finished streaming');
      },
      initialMessages: initialMessages,
    });

    useEffect(() => {
      const messagesChanged =
        messages.length !== prevMessagesRef.current.length ||
        messages.some((msg, i) => {
          const prevMsg = prevMessagesRef.current[i];
          return (
            !prevMsg ||
            msg.content !== prevMsg.content ||
            msg.role !== prevMsg.role
          );
        });

      if (messagesChanged) {
        prevMessagesRef.current = messages;
        setStoreMessages(messages);
      }

      setIsLoading(isLoading);
    }, [messages, isLoading, setStoreMessages, setIsLoading]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } =
      usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    const chatId = useChatStore((state) => state.chatId);

    useEffect(() => {
      if (initialMessages.length > 0) {
        setStarted(true);
        setChatStarted(true);
        return;
      }
    }, [initialMessages, setStarted]);

    useEffect(() => {
      if (!storedStarted && storedMessages.length === 0) {
        setChatStarted(false);
        setMessages([]);
        setInput('');
      }
    }, [storedStarted, storedMessages, setMessages, setInput]);

    useEffect(() => {
      parseMessages(messages, isLoading);

      if (messages.length > initialMessages.length) {
        storeMessageHistory(messages).catch((error) =>
          toast.error(error.message),
        );
      }
    }, [messages, isLoading, parseMessages]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      setAborted(true);
      workbenchStore.abortAllActions();
    };

    const [streamTimedOut, setStreamTimedOut] = useState(false);
    const lastTokenTimeRef = useRef(Date.now());
    const stallCheckRef = useRef<ReturnType<typeof setInterval> | undefined>(
      undefined,
    );
    const autoRetryCountRef = useRef(0);

    useEffect(() => {
      if (isLoading) {
        lastTokenTimeRef.current = Date.now();
        setStreamTimedOut(false);
        clearInterval(stallCheckRef.current);
        stallCheckRef.current = setInterval(() => {
          const elapsed = Date.now() - lastTokenTimeRef.current;
          if (elapsed > 60_000) {
            clearInterval(stallCheckRef.current);
            logger.warn(`[Timeout] Stream stalled for 60s.`);
            stop();

            if (autoRetryCountRef.current < 2) {
              autoRetryCountRef.current += 1;
              logger.warn(
                `[Timeout] Auto-retrying generation (${autoRetryCountRef.current}/2)...`,
              );
              setAborted(false);
              reload();
            } else {
              logger.warn(
                '[Timeout] Max auto-retries exceeded. Showing retry button.',
              );
              setAborted(true);
              workbenchStore.abortAllActions();
              setStreamTimedOut(true);
            }
          }
        }, 5_000);
      } else {
        clearInterval(stallCheckRef.current);
        if (!streamTimedOut) {
          autoRetryCountRef.current = 0;
        }
      }

      return () => clearInterval(stallCheckRef.current);
    }, [messages, isLoading, reload, stop, streamTimedOut]);

    const handleRetry = () => {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === 'user');
      if (!lastUserMsg) return;

      setStreamTimedOut(false);
      setAborted(false);
      append({
        role: 'user',
        content: lastUserMsg.content,
      });
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY =
          scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      try {
        await animate(
          '#intro',
          { opacity: 0 },
          { duration: 0.2, ease: cubicEasingFn },
        );
      } catch (error) {
        logger.error('Animation failed', error);
      } finally {
        setStarted(true);
        setChatStarted(true);
      }
    };

    const sendMessage = async (
      _event: React.UIEvent,
      messageInput?: string,
    ) => {
      const _input = messageInput || input;

      if (_input.length === 0 || isLoading) {
        return;
      }

      const isVeryLongChat = _input.length > 250;
      const hasBuildKeywords = /build|create|make|website|app|code|generate|design/i.test(_input);
      const isProbableCodeRequest = hasBuildKeywords || isVeryLongChat;

      if (isProbableCodeRequest) {
        try {
          const getHostname = () =>
            typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const backendUrl =
            process.env.NEXT_PUBLIC_CODE_RUNNER_API_URL ||
            `http://${getHostname()}:3001`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          await window.fetch(`${backendUrl.replace(/\/$/, '')}/health`, { signal: controller.signal });
          clearTimeout(timeoutId);
        } catch (error) {
          logger.error('Engine connection check failed', error);
          
          setAborted(false);
          runAnimation();

          const userMsg = { id: String(Date.now()), role: 'user' as const, content: _input };
          const assistantMsg = { 
            id: String(Date.now() + 1), 
            role: 'assistant' as const, 
            content: "The coding engine is warming up 🔄 — it may have been inactive for a while. Please wait a few seconds and try again!" 
          };
          
          setMessages([...messages, userMsg, assistantMsg]);
          setInput('');
          resetEnhancer();
          textareaRef.current?.blur();
          return;
        }
      }

      try {
        await workbenchStore.saveAllFiles();
      } catch (error) {
        logger.error('Failed to save files', error);
      }

      const fileModifications = workbenchStore.getFileModifcations();

      setAborted(false);

      runAnimation();

      if (fileModifications !== undefined) {
        const diff = fileModificationsToHTML(fileModifications);
        append({ role: 'user', content: `${diff}\n\n${_input}` });
        workbenchStore.resetAllFileModifications();
      } else {
        append({ role: 'user', content: _input });
      }

      setInput('');

      resetEnhancer();

      textareaRef.current?.blur();
    };

    const [messageRef, scrollRef] = useSnapScroll();
    const pendingFix = useChatStore((state) => state.pendingFix);
    const pendingErrorLog = useChatStore((state) => state.pendingErrorLog);
    const setPendingFix = useChatStore((state) => state.setPendingFix);
    const setPendingErrorLog = useChatStore(
      (state) => state.setPendingErrorLog,
    );

    useEffect(() => {
      if (pendingFix) {
        const logContent =
          pendingErrorLog || useTerminalStore.getState().getOutput();

        append({
          role: 'user',
          content: `I noticed a build error in the terminal. Here is the terminal output:\n\n${logContent}\n\nPlease deeply analyze the code and the error, and provide a comprehensive fix.`,
        });
        useWorkbenchStore.getState().setBuildError(false);
        setPendingFix(false);
        setPendingErrorLog(undefined);
      }
    }, [
      pendingFix,
      pendingErrorLog,
      append,
      setPendingFix,
      setPendingErrorLog,
    ]);

    return (
      <ChatInterface
        ref={animationScope}
        textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        messageRef={messageRef}
        scrollRef={scrollRef}
        handleInputChange={handleInputChange}
        handleStop={abort}
        messages={messages.map((message, i) => {
          if (message.role === 'user') {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[i] || '',
          };
        })}
        enhancePrompt={() => {
          enhancePrompt(
            input,
            (input: string) => {
              setInput(input);
              scrollTextArea();
            },
            selectedProvider,
          );
        }}
        selectedProvider={selectedProvider}
        onProviderChange={(provider) => setSelectedProvider(provider)}
        onHistoryClick={() => setShowHistory(true)}
        streamTimedOut={streamTimedOut}
        onRetry={handleRetry}
      />
    );
  },
);

ChatImpl.displayName = 'ChatImpl';
