import type { Message } from 'ai';
import { useCallback, useState, useMemo } from 'react';
import { StreamingMessageParser } from '../lib/runtime/message-parser';
import { workbenchStore } from '../stores/workbench';
import { useWorkbenchStore } from '../stores/zustand';
import { createScopedLogger } from '../utils/logger';

const logger = createScopedLogger('useMessageParser');

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{
    [key: number]: string;
  }>({});

  const messageParser = useMemo(() => {
    return new StreamingMessageParser({
      callbacks: {
        onArtifactOpen: (data) => {
          logger.trace('onArtifactOpen', data);

          useWorkbenchStore.getState().setShowWorkbench(true);
          workbenchStore.addArtifact(data);
        },
        onArtifactClose: (data) => {
          logger.trace('onArtifactClose');

          workbenchStore.updateArtifact(data, { closed: true });

          const artifact = useWorkbenchStore.getState().artifacts[data.messageId];
          if (artifact && artifact.actions) {
            for (const [actionId, action] of Object.entries(artifact.actions)) {
              if (action.type === 'shell' && !action.executed) {
                workbenchStore.runAction({
                  artifactId: data.id,
                  messageId: data.messageId,
                  actionId,
                  action: action as any,
                });
              }
            }
          }
        },
        onActionOpen: (data) => {
          logger.trace('onActionOpen', data.action);
          if (data.action.type === 'file') {
            const userHid = useWorkbenchStore.getState().userHidWorkbench;
            if (!userHid) {
              useWorkbenchStore.getState().setShowWorkbench(true);
            }
          }

          if (data.action.type !== 'shell') {
            workbenchStore.addAction(data);
          }
        },
        onActionClose: (data) => {
          logger.trace('onActionClose', data.action);

          if (data.action.type === 'shell') {
            workbenchStore.addAction(data);
          } else {
            workbenchStore.runAction(data);
          }
        },
      },
    });
  }, []);

  const parseMessages = useCallback(
    (messages: Message[], isLoading: boolean) => {
      let reset = false;

      if (process.env.NODE_ENV === 'development' && !isLoading) {
        reset = true;
        messageParser.reset();
      }

      for (const [index, message] of messages.entries()) {
        if (message.role === 'assistant') {
          const newParsedContent = messageParser.parse(
            message.id,
            (message as any).content,
          );

          setParsedMessages((prevParsed) => ({
            ...prevParsed,
            [index]: !reset
              ? (prevParsed[index] || '') + newParsedContent
              : newParsedContent,
          }));
        }
      }
    },
    [messageParser],
  );

  return { parsedMessages, parseMessages };
}
