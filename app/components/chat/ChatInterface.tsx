import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import type { Message } from 'ai';
import { type RefCallback } from 'react';
import { ClientOnly } from '../ui/ClientOnly';
import { Messages } from './ChatMessageList.client';
import { ModelSelector, MODELS, type ModelProvider } from './ChatModelSelector';
import { useAiBuilderStore } from '../../stores/ai-builder-store';
import { SendButton } from './ChatSendButton.client';

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  selectedProvider?: ModelProvider;
  onProviderChange?: (provider: ModelProvider) => void;
  onHistoryClick?: () => void;
  streamTimedOut?: boolean;
  onRetry?: () => void;
}

const EXAMPLE_PROMPTS = [
  { text: 'Design a modern Landing Page' },
  { text: 'Build a personal Portfolio website' },
  { text: 'Create an E-commerce store' },
  { text: 'Develop a Business website' },
  { text: 'Build a Blog Platform' },
];

export const ChatInterface = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop,
      selectedProvider = 'google',
      onProviderChange = () => {},
      streamTimedOut,
      onRetry,
    },
    ref,
  ) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const modelSelectorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const setIsSettingsModalOpen = useAiBuilderStore(
      (state) => state.setIsSettingsModalOpen,
    );
    const isSelectionMode = useAiBuilderStore((state) => state.isSelectionMode);
    const setSelectionMode = useAiBuilderStore(
      (state) => state.setSelectionMode,
    );
    const selectedElement = useAiBuilderStore((state) => state.selectedElement);
    const setSelectedElement = useAiBuilderStore(
      (state) => state.setSelectedElement,
    );

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          modelSelectorRef.current &&
          !modelSelectorRef.current.contains(event.target as Node)
        ) {
          setIsModelPickerOpen(false);
        }
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setIsMenuOpen(false);
        }
      };

      if (isModelPickerOpen || isMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isModelPickerOpen, isMenuOpen]);

    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImage(event.target?.result as string);
          setIsMenuOpen(false);
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div
        className="relative z-9 flex h-full w-full flex-grow flex-col overflow-hidden"
        ref={ref}
      >
        <div className="flex h-full flex-col">
          <div
            className="relative h-full w-full overflow-y-auto scroll-smooth"
            ref={scrollRef}
          >
            {chatStarted ? (
              <ClientOnly>
                {() => {
                  return (
                    <Messages
                      ref={messageRef}
                      className="z-1 mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pt-4"
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  );
                }}
              </ClientOnly>
            ) : (
              <div
                id="intro"
                className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="h-64 w-64 rounded-full bg-gradient-to-tr from-[var(--d-admin-primary-color)]/30 to-purple-500/30 blur-[80px] animate-pulse"></div>
                  <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-[60px] animate-bounce delay-1000"></div>
                </div>
                <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
                  <div className="mb-2 flex flex-col items-center space-y-4 text-center">
                    <div className="relative mb-2 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-white/10">
                      <Icon
                        icon="ph:sparkle-fill"
                        className="text-3xl text-[var(--d-admin-primary-color)] animate-pulse"
                      />
                    </div>
                    <h1 className="animate-in fade-in slide-in-from-bottom-4 text-4xl font-bold tracking-tight text-[var(--d-admin-text-color)] duration-700 md:text-5xl">
                      <span className="bg-gradient-to-b from-[var(--d-admin-text-color)] to-[var(--d-admin-text-color-secondary)] bg-clip-text text-transparent">
                        What will you build?
                      </span>
                    </h1>
                    <p
                      className="animate-in fade-in slide-in-from-bottom-4 max-w-md text-base text-[var(--d-admin-text-color-secondary)] duration-700"
                      style={{ animationDelay: '100ms' }}
                    >
                      I can help you create stunning websites, apps, and tools
                      in seconds.
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap justify-center gap-2.5 px-2">
                    {EXAMPLE_PROMPTS.map((examplePrompt, index) => (
                      <button
                        key={index}
                        onClick={(event) =>
                          sendMessage?.(event, examplePrompt.text)
                        }
                        className="group relative flex items-center gap-2.5 rounded-full border border-white/5 bg-[var(--d-admin-surface-card)]/20 px-4 py-2.5 text-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--d-admin-surface-card)]/40 hover:border-[var(--d-admin-primary-color)]/30 hover:shadow-lg hover:shadow-[var(--d-admin-primary-color)]/10 ring-1 ring-transparent hover:ring-[var(--d-admin-primary-color)]/20"
                        style={{
                          animationDelay: `${200 + index * 50}ms`,
                          animationFillMode: 'backwards',
                        }}
                      >
                        <span
                          className={`flex items-center justify-center text-base ${
                            index === 0
                              ? 'text-orange-400'
                              : index === 1
                                ? 'text-yellow-400'
                                : index === 2
                                  ? 'text-blue-400'
                                  : index === 3
                                    ? 'text-teal-400'
                                    : 'text-purple-400'
                          }`}
                        >
                          <Icon
                            icon={
                              index === 0
                                ? 'ph:rocket-launch-duotone'
                                : index === 1
                                  ? 'ph:user-circle-duotone'
                                  : index === 2
                                    ? 'ph:shopping-cart-duotone'
                                    : index === 3
                                      ? 'ph:buildings-duotone'
                                      : 'ph:article-duotone'
                            }
                          />
                        </span>
                        <span className="text-[var(--d-admin-text-color)]/80 transition-colors group-hover:text-[var(--d-admin-text-color)]">
                          {examplePrompt.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="z-20" data-chat-input>
            <div className="max-w-chat z-prompt mx-auto w-full pr-[0.5rem] pb-3 md:pr-1 pl-[0.5rem] pb-[0.5rem]">
              <div className="relative" style={{ height: '0px' }}>
                <div className="absolute -top-px left-2 flex w-[calc(100%-1rem)] flex-wrap justify-between truncate rounded-t-lg border border-b-0 border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] px-2 py-1 text-xs opacity-0 backdrop-blur transition-opacity duration-350">
                  <span>300K daily tokens remaining.</span>
                  <button className="mr-4 inline-block bg-transparent font-medium text-[var(--d-admin-blue-600)] hover:underline">
                    Switch to Pro for 33x more usage
                  </button>
                  <button className="absolute top-1 right-1 flex items-center rounded-md bg-transparent p-0.5 text-[var(--d-admin-text-color-secondary)] enabled:hover:bg-[var(--d-admin-surface-hover)] enabled:hover:text-[var(--d-admin-text-color)] disabled:cursor-not-allowed">
                    <Icon icon="ph:x" className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="relative rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-[1px] shadow-xs">
                {attachedImage && (
                  <div className="p-3">
                    <div className="group relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-card)]">
                      <img
                        src={attachedImage}
                        alt="Attached"
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="absolute top-1 right-1 flex items-center justify-center rounded-full border border-[var(--d-admin-surface-border)] bg-transparent p-1 text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                      >
                        <Icon icon="ph:x" className="size-3" />
                      </button>
                    </div>
                  </div>
                )}
                {selectedElement && (
                  <div className="p-3 pt-0">
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-card)] px-3 py-2 text-sm text-[var(--d-admin-text-color)]">
                      <Icon
                        icon="ph:cursor-click"
                        className="text-[var(--d-admin-blue-600)]"
                      />
                      <span className="font-medium">
                        Selected: {selectedElement.tagName.toLowerCase()}
                        {selectedElement.id ? `#${selectedElement.id}` : ''}
                      </span>
                      <button
                        onClick={() => setSelectedElement(null)}
                        className="ml-auto flex items-center justify-center rounded-full text-[var(--d-admin-text-color-secondary)] hover:text-[var(--d-admin-text-color)]"
                      >
                        <Icon icon="ph:x" className="size-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-lg dark:shadow-lg">
                  <div className="border-transparent" style={{ height: '0px' }}>
                    <div className="border-b-px relative right-0 left-0 h-full overflow-hidden rounded-t-[0.44rem] border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] opacity-0 transition-opacity duration-200">
                      <div className="flex px-2.5 py-2.5 text-xs font-medium">
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="flex items-center gap-2"></div>
                          <div className="flex items-center gap-2">
                            <button className="bg-transparent px-2 py-1.5 text-xs text-[var(--d-admin-blue-600)] hover:underline">
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="border-b-px border-transparent"
                    style={{ height: '0px' }}
                  >
                    <div className="border-b-px relative right-0 left-0 h-full overflow-hidden rounded-t-[0.44rem] border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] opacity-0 transition-opacity duration-200">
                      <div className="flex px-2.5 py-1.5 text-xs font-medium">
                        <div className="flex-grow"></div>
                        <button className="bg-transparent text-[var(--d-admin-blue-600)] hover:underline">
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative select-none">
                    <textarea
                      ref={textareaRef}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          if (event.shiftKey) {
                            return;
                          }
                          event.preventDefault();
                          let messageContent = input;
                          if (selectedElement) {
                            const elementInfo = `Selected Element: <${selectedElement.tagName.toLowerCase()}${
                              selectedElement.id
                                ? ` id="${selectedElement.id}"`
                                : ''
                            }${selectedElement.class ? ` class="${selectedElement.class}"` : ''}>${
                              selectedElement.text
                                ? `\nText content: "${selectedElement.text}"`
                                : ''
                            }\n\n`;
                            messageContent = `${elementInfo}${input}`;
                            setSelectedElement(null);
                          }

                          sendMessage?.(event, messageContent);
                        }
                      }}
                      value={input}
                      onChange={(event) => {
                        handleInputChange?.(event);
                      }}
                      aria-label="How can D Admin help you today?"
                      className="w-full resize-none bg-transparent pt-5 pr-16 pl-5 text-sm text-[var(--d-admin-text-color)] placeholder-[var(--d-admin-gray-600)] focus:outline-none"
                      placeholder="How can D Admin help you today?"
                      translate="no"
                      style={{
                        minHeight: '80px',
                        maxHeight: '400px',
                        height: '80px',
                        overflowY: 'hidden',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-3 text-sm">
                    <div className="flex min-w-0 flex-shrink items-center gap-1">
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={() => setIsMenuOpen(!isMenuOpen)}
                          aria-label="Prompt actions"
                          className={`group/button relative flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--d-admin-surface-hover)] text-base leading-none text-[var(--d-admin-text-color)] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--d-admin-blue-600)] enabled:hover:bg-[var(--d-admin-surface-hover)] disabled:cursor-not-allowed ${isMenuOpen ? 'bg-[var(--d-admin-surface-hover)]' : ''}`}
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          data-state={isMenuOpen ? 'open' : 'closed'}
                        >
                          <div className="">
                            {isMenuOpen ? (
                              <Icon icon="ph:x" className="block size-4" />
                            ) : (
                              <Icon
                                icon="heroicons:plus"
                                className="block size-4 transition-transform duration-300 ease-out"
                              />
                            )}
                          </div>
                        </button>

                        {isMenuOpen && (
                          <div className="animate-in fade-in zoom-in-95 absolute bottom-full left-0 z-50 mb-2 w-56 origin-bottom-left overflow-hidden rounded-xl border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1 shadow-lg duration-100">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => {
                                  fileInputRef.current?.click();
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                              >
                                <Icon
                                  icon="ph:file-plus"
                                  className="text-lg text-[var(--d-admin-text-color-secondary)]"
                                />
                                <span>Attach file</span>
                              </button>
                              <button
                                onClick={() => {
                                  enhancePrompt?.();
                                  setIsMenuOpen(false);
                                }}
                                disabled={input.length === 0 || enhancingPrompt}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Icon
                                  icon={
                                    enhancingPrompt
                                      ? 'svg-spinners:90-ring-with-bg'
                                      : 'ph:sparkle'
                                  }
                                  className={`text-lg ${enhancingPrompt ? 'text-blue-500' : 'text-[var(--d-admin-text-color-secondary)]'}`}
                                />
                                <span>
                                  {enhancingPrompt
                                    ? 'Enhancing prompt...'
                                    : promptEnhanced
                                      ? 'Prompt enhanced'
                                      : 'Enhance prompt'}
                                </span>
                              </button>
                              <button
                                onClick={() => {
                                  setIsSettingsModalOpen(true);
                                  setIsMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                              >
                                <Icon
                                  icon="ph:gear-duotone"
                                  className="text-lg text-[var(--d-admin-text-color-secondary)]"
                                />
                                <span>Project Settings</span>
                              </button>
                              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]">
                                <Icon
                                  icon="ph:question"
                                  className="text-lg text-[var(--d-admin-text-color-secondary)]"
                                />
                                <span>Search Help Center</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex">
                        <div className="ml-1">
                          <div style={{ opacity: 1 }}>
                            <div className="relative" ref={modelSelectorRef}>
                              {(() => {
                                const model = MODELS.find(
                                  (m) => m.value === selectedProvider,
                                );
                                const label = model?.label || selectedProvider;
                                const icon = model?.icon || 'logos:claude';

                                return (
                                  <>
                                    <button
                                      onClick={() =>
                                        setIsModelPickerOpen(!isModelPickerOpen)
                                      }
                                      className="disabled:op-50 group/button relative flex h-9 max-w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-full bg-transparent px-3 text-sm font-medium text-[var(--d-admin-text-color)] hover:text-[var(--d-admin-text-color)] focus-visible:outline-2 focus-visible:outline-[var(--d-admin-blue-600)] enabled:hover:bg-[var(--d-admin-surface-hover)] disabled:cursor-not-allowed dark:text-[var(--d-admin-text-color)]"
                                      type="button"
                                      aria-haspopup="menu"
                                      aria-expanded={isModelPickerOpen}
                                      data-state={
                                        isModelPickerOpen ? 'open' : 'closed'
                                      }
                                    >
                                      <Icon
                                        icon={icon}
                                        className="flex size-5 items-center justify-center text-lg leading-none"
                                      />
                                      <span className="truncate">
                                        <span className="ml-1">{label}</span>
                                      </span>
                                      <Icon
                                        icon="heroicons:chevron-up-down"
                                        className="flex size-4 items-center justify-center opacity-70 group-hover/button:opacity-100"
                                      />
                                    </button>

                                    {isModelPickerOpen && (
                                      <ClientOnly>
                                        {() => (
                                          <ModelSelector
                                            value={selectedProvider}
                                            handleSelectModel={(val) => {
                                              onProviderChange(val);
                                              setIsModelPickerOpen(false);
                                            }}
                                          />
                                        )}
                                      </ClientOnly>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden flex-1 sm:block"></div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {streamTimedOut && !isStreaming && (
                        <button
                          title="Generation stalled — retry"
                          className="flex h-7 items-center gap-1.5 rounded-full bg-amber-500/10 px-3 text-xs font-medium text-amber-500 ring-1 ring-amber-500/30 hover:bg-amber-500/20 transition-colors"
                          onClick={() => onRetry?.()}
                        >
                          <Icon
                            icon="ph:arrow-clockwise"
                            className="h-3.5 w-3.5"
                          />
                          <span>Generation stalled — Retry</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectionMode(!isSelectionMode)}
                        className={`flex h-7 items-center gap-1 rounded-full px-2 text-xs transition-colors ${
                          isSelectionMode
                            ? 'bg-[var(--d-admin-blue-600)] text-white hover:bg-[var(--d-admin-blue-700)]'
                            : 'bg-transparent text-[var(--d-admin-gray-600)] hover:bg-[var(--d-admin-surface-hover)] hover:text-[var(--d-admin-text-color)]'
                        }`}
                        aria-pressed={isSelectionMode}
                      >
                        <Icon icon="ph:cursor-click" className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {isSelectionMode ? 'Cancel Selection' : 'Select'}
                        </span>
                      </button>
                      <ClientOnly>
                        {() => (
                          <SendButton
                            show={true}
                            isStreaming={isStreaming}
                            onClick={(event) => {
                              if (isStreaming) {
                                handleStop?.();
                                return;
                              }
                              let messageContent = input;
                              if (selectedElement) {
                                const elementInfo = `Selected Element: <${selectedElement.tagName.toLowerCase()}${
                                  selectedElement.id
                                    ? ` id="${selectedElement.id}"`
                                    : ''
                                }${
                                  selectedElement.class
                                    ? ` class="${selectedElement.class}"`
                                    : ''
                                }>${
                                  selectedElement.text
                                    ? `\nText content: "${selectedElement.text}"`
                                    : ''
                                }\n\n`;
                                messageContent = `${elementInfo}${input}`;
                                setSelectedElement(null);
                              }

                              sendMessage?.(event, messageContent);
                            }}
                          />
                        )}
                      </ClientOnly>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelection}
                      aria-hidden="true"
                      tabIndex={-1}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.txt,.doc,.docx,.py,.ipynb,.js,.mjs,.cjs,.jsx,.html,.css,.scss,.sass,.ts,.tsx,.java,.cs,.php,.c,.cc,.cpp,.cxx,.h,.hh,.hpp,.rs,.swift,.go,.rb,.kt,.kts,.scala,.sh,.bash,.zsh,.bat,.csv,.log,.ini,.cfg,.config,.json,.yaml,.yml,.toml,.lua,.sql,.md,.tex,.latex,.asm,.ino,.s"
                      multiple
                      style={{ display: 'none', visibility: 'hidden' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ChatInterface;
