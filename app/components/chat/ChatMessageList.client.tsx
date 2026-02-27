import type { Message } from 'ai';
import { Icon } from '@iconify/react';
import React, { useEffect, useState } from 'react';
import { classNames } from '../../utils/classNames';
import { AssistantMessage } from './ChatAssistantMessage';
import { UserMessage } from './ChatUserMessage';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref) => {
    const { id, isStreaming = false, messages = [] } = props;
    const [bottomPadding, setBottomPadding] = useState('5rem');
    useEffect(() => {
      const updatePadding = () => {
        const inputArea = document.querySelector(
          '[data-chat-input]',
        ) as HTMLElement;
        if (inputArea) {
          const height = inputArea.getBoundingClientRect().height;
          setBottomPadding(`${height}px`);
        }
      };
      updatePadding();
      window.addEventListener('resize', updatePadding);
      const inputArea = document.querySelector('[data-chat-input]');
      let resizeObserver: ResizeObserver | null = null;

      if (inputArea) {
        resizeObserver = new ResizeObserver(updatePadding);
        resizeObserver.observe(inputArea);
      }

      return () => {
        window.removeEventListener('resize', updatePadding);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }, []);

    return (
      <div
        id={id}
        ref={ref}
        className={props.className}
        style={{ paddingBottom: bottomPadding }}
      >
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;

              return (
                <div
                  key={index}
                  className={classNames('flex w-full', {
                    'mt-6': !isFirst,
                    'justify-end': isUserMessage,
                    'justify-start': !isUserMessage,
                  })}
                >
                  {isUserMessage ? (
                    <div className="bg-[var(--d-admin-surface-ground)] text-[var(--d-admin-text-color)] flex max-w-[85%] items-start gap-3 rounded-lg px-4 py-3 shadow-md">
                      <div className="min-w-0 flex-1">
                        <UserMessage content={content} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-3">
                      <div className="flex items-center select-none justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--d-admin-text-color)] text-sm font-semibold">
                            D Admin
                          </span>
                        </div>
                      </div>
                      <div className="text-[var(--d-admin-text-color)] text-sm w-full">
                        <AssistantMessage content={content} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="mt-6 flex w-full justify-start">
            <div className="flex w-full flex-col gap-1 mt-6">
              <div className="flex items-center select-none justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--d-admin-text-color)] text-sm font-semibold">
                    D Admin
                  </span>
                </div>
              </div>
              <div className="flex items-center pt-[2px]">
                <Icon
                  icon="svg-spinners:3-dots-fade"
                  className="text-[var(--d-admin-text-color-secondary)] text-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

Messages.displayName = 'Messages';
