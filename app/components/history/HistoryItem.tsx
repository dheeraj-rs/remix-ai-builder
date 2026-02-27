import { Icon } from '@iconify/react';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { type ChatHistoryItem } from '../../lib/persistence';
import { Link } from 'react-router';
import { useAiBuilderStore } from '../../stores/ai-builder-store';
import {
  useChatStore,
  useFilesStore,
  useEditorStore,
  usePreviewStore,
  useTerminalStore,
} from '../../stores/zustand';
import { workbenchStore } from '../../stores/workbench';
import { RemoteWebContainer } from '../../lib/remote-execution-adapter';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
  onSelect?: () => void;
}

export function HistoryItem({ item, onDelete, onSelect }: HistoryItemProps) {
  const [hovering, setHovering] = useState(false);
  const hoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;

    function mouseEnter() {
      setHovering(true);

      if (timeout) {
        clearTimeout(timeout);
      }
    }

    function mouseLeave() {
      setHovering(false);
    }

    hoverRef.current?.addEventListener('mouseenter', mouseEnter);
    hoverRef.current?.addEventListener('mouseleave', mouseLeave);

    return () => {
      hoverRef.current?.removeEventListener('mouseenter', mouseEnter);
      hoverRef.current?.removeEventListener('mouseleave', mouseLeave);
    };
  }, []);

  return (
    <div
      ref={hoverRef}
      className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:bg-[var(--d-admin-surface-hover)]"
    >
      <span className="rounded-md bg-[var(--d-admin-surface-section)] p-1.5 text-[var(--d-admin-text-color-secondary)] transition-colors group-hover:text-[var(--d-admin-primary-color)]">
        <Icon icon="ph:chat-circle-text" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/ai-website-builder/${item.id}`}
          className="relative block flex w-full truncate"
          onClick={() => {
            workbenchStore.reset();
            useFilesStore.getState().reset();
            useEditorStore.getState().reset();
            usePreviewStore.getState().reset();
            useChatStore.getState().reset();
            useTerminalStore.getState().reset();
            RemoteWebContainer.activeInstance?.teardown();
            RemoteWebContainer.activeInstance?.mount({});
            onSelect?.();
            useAiBuilderStore.getState().setIsHistoryOpen(false);
            useChatStore.getState().setShowHistory(false);
            useAiBuilderStore.getState().setActiveMobilePanel('chat');
          }}
        >
          <div className="flex w-full min-w-0 flex-col">
            <span className="truncate">{item.description}</span>
            <span className="truncate text-xs text-[var(--d-admin-text-color-secondary)]">
              {formatDistanceToNow(new Date(item.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="absolute top-0 right-0 bottom-0 z-1 flex w-10 justify-end group-hover:w-15 group-hover:from-45%">
            {hovering && (
              <div className="flex items-center p-1 text-gray-500 hover:text-red-500">
                <Dialog.Trigger asChild>
                  <button
                    className="scale-110"
                    onClick={(event) => {
                      event.preventDefault();
                      onDelete?.(event);
                    }}
                  >
                    <Icon icon="ph:trash" />
                  </button>
                </Dialog.Trigger>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
