import React from 'react';
import { Icon } from '@iconify/react';
import { useAiBuilderStore } from '../../stores/ai-builder-store';
import { useProjectsStore } from '../../stores/projects-store';
import { workbenchStore } from '../../stores/workbench';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogButton,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '../ui/UiDialog';
import { useChatStore } from '../../stores/zustand';
import { type ChatHistoryItem } from '../../lib/persistence';
import { logger } from '../../utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './HistoryDateBinning';
import { Link } from 'react-router';

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

interface MenuProps {
  onSelect?: () => void;
}

export function HistorySidebar({ onSelect }: MenuProps) {
  const { isHistoryOpen, setIsHistoryOpen } = useAiBuilderStore();

  const { projects, fetchProjects, deleteProject } = useProjectsStore();
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const list: ChatHistoryItem[] = projects
    .filter((p) => !p.type || p.type === 'ai')
    .map((p) => ({
      id: p.id,
      urlId: p.id,
      description: p.description || p.name,
      messages: [],
      timestamp: new Date(p.updatedAt).toISOString(),
    }));

  const deleteItem = useCallback(
    (event: React.UIEvent, item: ChatHistoryItem) => {
      event.preventDefault();

      deleteProject(item.id)
        .then(() => {
          if (useChatStore.getState().chatId === item.id) {
            window.location.pathname = '/ai-website-builder';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    },
    [deleteProject],
  );

  const closeDialog = () => {
    setDialogContent(null);
  };

  if (!isHistoryOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex h-full font-sans">
      <div className="animate-in slide-in-from-left flex h-full w-[280px] flex-col border-r border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] shadow-2xl duration-300 ease-in-out">
        <div className="border-b border-[var(--d-admin-surface-border)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--d-admin-text-color)]">
              <Icon
                icon="ph:clock-counter-clockwise"
                className="size-5 text-[var(--d-admin-text-color-secondary)]"
              />
              History
            </h2>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="rounded-md p-1.5 text-[var(--d-admin-text-color-secondary)] transition-colors hover:bg-[var(--d-admin-surface-hover)] hover:text-[var(--d-admin-text-color)]"
            >
              <Icon icon="ph:x" className="size-4" />
            </button>
          </div>
          <div className="relative">
            <Icon
              icon="ph:magnifying-glass"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--d-admin-text-color-secondary)]"
            />
            <input
              type="text"
              placeholder="Search history..."
              className="w-full rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] py-2 pr-3 pl-9 text-sm text-[var(--d-admin-text-color)] placeholder-[var(--d-admin-text-color-secondary)] transition-colors focus:border-[var(--d-admin-blue-600)] focus:outline-none"
            />
          </div>
        </div>
        <div className="p-4">
          <Link
            to="/ai-website-builder"
            onClick={() => {
              workbenchStore.reset();
              setIsHistoryOpen(false);
            }}
            className="flex items-center gap-2 rounded-md bg-blue-500/10 p-2 text-blue-500 transition-colors hover:bg-blue-500/20"
          >
            <Icon icon="ph:chat-circle-dots" className="text-lg" />
            Start new chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {list.length === 0 && (
            <div className="pl-2">No previous conversations</div>
          )}
          <DialogRoot open={dialogContent !== null}>
            {binDates(list).map(({ category, items }) => (
              <div key={category} className="flex flex-col gap-1">
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-[var(--d-admin-text-color-secondary)] uppercase">
                  {category}
                </h3>
                {items.map((item) => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    onDelete={() => setDialogContent({ type: 'delete', item })}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ))}
            <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
              {dialogContent?.type === 'delete' && (
                <>
                  <DialogTitle>Delete Chat?</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      <p>
                        You are about to delete{' '}
                        <strong>{dialogContent.item.description}</strong>.
                      </p>
                      <p className="mt-1">
                        Are you sure you want to delete this chat?
                      </p>
                    </div>
                  </DialogDescription>
                  <div className="flex justify-end gap-2 px-5 pb-4">
                    <DialogButton type="secondary" onClick={closeDialog}>
                      Cancel
                    </DialogButton>
                    <DialogButton
                      type="danger"
                      onClick={(event) => {
                        deleteItem(event, dialogContent.item);
                        closeDialog();
                      }}
                    >
                      Delete
                    </DialogButton>
                  </div>
                </>
              )}
            </Dialog>
          </DialogRoot>
        </div>
      </div>
      <div
        className="flex-1 h-full bg-black/50 transition-opacity duration-300 backdrop-blur-sm"
        onClick={() => setIsHistoryOpen(false)}
      ></div>
    </div>
  );
}
