import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
  type HighlighterGeneric,
} from 'shiki';
import type { ActionState } from '../../lib/runtime/action-runner';
import { useWorkbenchStore } from '../../stores/zustand';
import { useAiBuilderStore } from '../../stores/ai-builder-store';
import { classNames } from '../../utils/classNames';
import { cubicEasingFn } from '../../utils/easings';

const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

let highlighterPromise:
  | Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
  | undefined;

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter(highlighterOptions);
  }
  return highlighterPromise;
};

interface ArtifactProps {
  messageId: string;
}

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);

  const artifacts = useWorkbenchStore((state) => state.artifacts);
  const artifact = artifacts[messageId];

  const actions = Object.values(artifact?.actions || {});

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  useEffect(() => {
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }
  }, [actions]);

  return (
    <div
      className="artifact flex w-full flex-col overflow-hidden rounded-lg transition-colors duration-150"
      style={{
        border: '1px solid var(--d-admin-surface-border)',
        maxWidth: '100%',
      }}
    >
      <div className="flex">
        <button
          className="flex w-full items-stretch overflow-hidden transition-colors"
          style={{ backgroundColor: 'var(--surface-b)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--d-admin-surface-c)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--surface-b)')
          }
          onClick={() => {
            const showWorkbench = useWorkbenchStore.getState().showWorkbench;
            const newShowState = !showWorkbench;
            useWorkbenchStore.getState().setUserHidWorkbench(!newShowState);
            useWorkbenchStore.getState().setShowWorkbench(newShowState);

            if (newShowState) {
              useAiBuilderStore.getState().setActiveMobilePanel('workbench');
              useWorkbenchStore.getState().setCurrentView('code');
            }
          }}
        >
          <div className="w-full p-3.5 px-5 text-left">
            <div
              className="w-full text-sm leading-5 font-medium"
              style={{ color: 'var(--d-admin-text-color)' }}
            >
              {artifact?.title}
            </div>
            <div
              className="mt-0.5 w-full text-xs"
              style={{ color: 'var(--d-admin-text-color-secondary)' }}
            >
              Click to open Workbench
            </div>
          </div>
        </button>
        <div
          className="w-px"
          style={{ backgroundColor: 'var(--d-admin-surface-border)' }}
        />
        <AnimatePresence>
          {actions.length && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="transition-colors"
              style={{ backgroundColor: 'var(--surface-b)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  'var(--d-admin-surface-c)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--surface-b)')
              }
              onClick={toggleActions}
            >
              <div className="p-4">
                <Icon
                  icon={showActions ? 'ph:caret-up-bold' : 'ph:caret-down-bold'}
                  style={{ color: 'var(--d-admin-text-color-secondary)' }}
                />
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showActions && actions.length > 0 && (
          <motion.div
            className="actions"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="h-px"
              style={{ backgroundColor: 'var(--d-admin-surface-border)' }}
            />
            <div
              className="p-5 text-left"
              style={{ backgroundColor: 'var(--surface-b)' }}
            >
              <ActionList actions={actions} messageId={messageId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ActionListProps {
  actions: ActionState[];
  messageId: string;
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const ActionList = memo(({ actions, messageId }: ActionListProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <ul className="list-none space-y-2.5">
        {actions.map((action, index) => {
          return (
            <ActionItem
              key={index}
              action={action}
              index={index}
              isLast={index === actions.length - 1}
              messageId={messageId}
            />
          );
        })}
      </ul>
    </motion.div>
  );
});

interface ActionItemProps {
  action: ActionState;
  index: number;
  isLast: boolean;
  messageId: string;
}

const ActionItem = memo(
  ({ action, messageId }: ActionItemProps) => {
    const { status, type, content, output } = action;
    const [isOpen, setIsOpen] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (status === 'running' || status === 'failed') {
        setIsOpen(true);
      }
    }, [status]);
    useEffect(() => {
      if (isOpen && terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, [output, isOpen]);

    return (
      <motion.li
        variants={actionVariants}
        initial="hidden"
        animate="visible"
        transition={{
          duration: 0.2,
          ease: cubicEasingFn,
        }}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <div className={classNames('text-lg', getIconColor(status))}>
            {status === 'running' ? (
              <Icon icon="svg-spinners:90-ring-with-bg" />
            ) : status === 'pending' ? (
              <Icon icon="ph:circle-duotone" />
            ) : status === 'complete' ? (
              <Icon icon="ph:check" />
            ) : status === 'failed' || status === 'aborted' ? (
              <Icon icon="ph:x" />
            ) : null}
          </div>
          {type === 'file' ? (
            <div>
              Create{' '}
              <code
                className="rounded-md px-1.5 py-1"
                style={{
                  backgroundColor: 'var(--d-admin-surface-c)',
                  color: 'var(--d-admin-text-color-secondary)',
                }}
              >
                {action.filePath}
              </code>
            </div>
          ) : type === 'shell' ? (
            <div className="flex min-h-[28px] w-full items-center">
              <span className="flex-1">
                {status === 'failed' && (content.toLowerCase().includes('npm run dev') || content.toLowerCase().includes('vite'))
                  ? 'Build Failed'
                  : content.toLowerCase().includes('npm install') ||
                    content.toLowerCase().includes('yarn add') ||
                    content.toLowerCase().includes('pnpm add')
                  ? 'Installing dependencies'
                  : content.toLowerCase().includes('npm run build') || content.toLowerCase().includes('tsc ')
                    ? 'Validating code'
                  : content.toLowerCase().includes('npm run dev') ||
                      content.toLowerCase().includes('vite') ||
                      content.toLowerCase().includes('node server')
                    ? 'Starting server'
                    : 'Run command'}
              </span>
              {(status === 'failed' ||
                status === 'aborted' ||
                (status === 'complete' &&
                  (content.toLowerCase().includes('npm run dev') ||
                    content.toLowerCase().includes('vite') ||
                    content.toLowerCase().includes('node server')))) && (
                <button
                  className="flex items-center gap-1 rounded bg-surface-b px-2 py-0.5 text-xs text-[var(--d-admin-text-color-secondary)] hover:bg-[var(--d-admin-surface-c)] hover:text-[var(--d-admin-text-color)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const {
                      useWorkbenchStore,
                    } = require('../../stores/zustand');
                    const { webcontainer } = require('../../lib/webcontainer');
                    const {
                      ActionRunner,
                    } = require('../../lib/runtime/action-runner');

                    let artifact =
                      useWorkbenchStore.getState().artifacts[messageId];

                    if (artifact) {
                      if (
                        !artifact.runner ||
                        !(artifact.runner instanceof ActionRunner)
                      ) {
                        const runner = new ActionRunner(
                          webcontainer,
                          messageId,
                        );

                        useWorkbenchStore
                          .getState()
                          .setArtifact(messageId, { ...artifact, runner });
                        artifact =
                          useWorkbenchStore.getState().artifacts[messageId];
                      }

                      const actionsMap = artifact.actions || {};
                      const actionId = Object.keys(actionsMap).find(
                        (key) => actionsMap[key] === action,
                      );

                      if (actionId && artifact.runner) {
                        artifact.runner.retryAction(actionId);
                      } else {
                        console.error(
                          'Could not find action ID for retry or runner failed to initialize',
                        );
                      }
                    }
                  }}
                >
                  <Icon icon="ph:arrow-clockwise" />
                  Retry
                </button>
              )}
            </div>
          ) : null}
        </div>
        {type === 'shell' && (
          <>
            {(output || status === 'running' || status === 'failed') && (
              <div className="mt-2 mb-3.5">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="mb-2 flex items-center gap-1 text-xs text-[var(--d-admin-text-color-secondary)] transition-colors hover:text-[var(--d-admin-text-color)]"
                >
                  <Icon
                    icon={isOpen ? 'ph:caret-down-bold' : 'ph:caret-right-bold'}
                  />
                  {status === 'running'
                    ? action.statusMessage || `Running ${content}`
                    : 'Terminal Output'}
                </button>

                {isOpen && (
                  <div
                    ref={terminalRef}
                    className="max-h-[200px] overflow-x-auto scroll-smooth rounded-md bg-black/90 p-3 font-mono text-xs whitespace-pre-wrap text-green-400"
                  >
                    {output?.trim() ||
                      (status === 'running'
                        ? 'Waiting for output...'
                        : 'No output')}
                  </div>
                )}
              </div>
            )}
            {status === 'failed' && (
              <div className="mt-2 mb-3.5 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <Icon
                    icon="ph:warning-circle"
                    className="mt-0.5 flex-shrink-0 text-lg text-red-500"
                  />
                  <div className="flex-1">
                    <div className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">
                      {'error' in action && (action.error as string)?.includes('taking a nap')
                        ? 'Engine Offline'
                        : 'Build Error Detected'}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-300">
                      {'error' in action && (action.error as string)?.includes('taking a nap')
                        ? action.error
                        : 'A build error was detected. Please fix the code.'}
                    </div>
                    {!((action as any).error as string)?.includes('taking a nap') && (
                      <button
                        onClick={() => {
                          const {
                            useChatStore,
                          } = require('../../stores/zustand');
                          useChatStore
                            .getState()
                            .setPendingErrorLog(output || (action as any).error || '');
                          useChatStore.getState().setPendingFix(true);
                        }}
                        className="mt-3 flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                      >
                        <Icon icon="ph:wrench-duotone" />
                        Fix Build Error
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.li>
    );
  },
);

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-gray-400 dark:text-gray-500';
    }
    case 'running': {
      return 'text-blue-500';
    }
    case 'complete': {
      return 'text-green-500';
    }
    case 'aborted': {
      return 'text-gray-400 dark:text-gray-500';
    }
    case 'failed': {
      return 'text-red-500';
    }
    default: {
      return undefined;
    }
  }
}
