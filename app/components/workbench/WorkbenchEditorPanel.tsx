import { Icon } from '@iconify/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import {
  CodeMirrorEditor,
  type EditorDocument,
  type OnChangeCallback as OnEditorChange,
  type OnSaveCallback as OnEditorSave,
  type OnScrollCallback as OnEditorScroll,
} from '../editor/CodeMirrorEditor';
import { IconButton } from '../ui/UiIconButton';
import { PanelHeader } from '../ui/UiPanelHeader';
import { PanelHeaderButton } from '../ui/UiPanelHeaderButton';
import { shortcutEventEmitter } from '../../hooks';
import type { FileMap } from '../../stores/files';
import { workbenchStore } from '../../stores/workbench';
import { useTerminalStore, useThemeStore } from '../../stores/zustand';
import { classNames } from '../../utils/classNames';
import {
  WORK_DIR,
  PANEL_SIZES,
  MAX_TERMINALS,
  EDITOR_SETTINGS,
  IGNORE_PATTERNS,
} from '../../utils/constants';
import { renderLogger } from '../../utils/logger';
import { isMobile } from '../../utils/mobile';
import { FileBreadcrumb } from './WorkbenchFileBreadcrumb';
import { FileTree } from './WorkbenchFileTree';
import { EmptyStateIllustration } from './WorkbenchEmptyStateIllustration';
import { Terminal, type TerminalRef } from './WorkbenchTerminal';

interface EditorPanelProps {
  files?: FileMap;
  unsavedFiles?: Set<string>;
  editorDocument?: EditorDocument;
  selectedFile?: string | undefined;
  isStreaming?: boolean;
  onEditorChange?: OnEditorChange;
  onEditorScroll?: OnEditorScroll;
  onFileSelect?: (value?: string) => void;
  onFileSave?: OnEditorSave;
  onFileReset?: () => void;
}

const DEFAULT_TERMINAL_SIZE = PANEL_SIZES.TERMINAL.default;
const DEFAULT_EDITOR_SIZE = 100 - DEFAULT_TERMINAL_SIZE;

const IGNORE_PATTERNS_REGEX = IGNORE_PATTERNS.map(
  (pattern) =>
    new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')),
);

export const EditorPanel = memo(
  ({
    files,
    unsavedFiles,
    editorDocument,
    selectedFile,
    isStreaming,
    onFileSelect,
    onEditorChange,
    onEditorScroll,
    onFileSave,
    onFileReset,
  }: EditorPanelProps) => {
    renderLogger.trace('EditorPanel');

    const theme = useThemeStore((state) => state.theme);
    const showTerminal = useTerminalStore((state) => state.showTerminal);

    const terminalRefs = useRef<Array<TerminalRef | null>>([]);
    const terminalPanelRef = useRef<ImperativePanelHandle>(null);
    const terminalToggledByShortcut = useRef(false);

    const filePanelRef = useRef<ImperativePanelHandle>(null);
    const [isFilePanelCollapsed, setIsFilePanelCollapsed] = useState(false);

    const [activeTerminal, setActiveTerminal] = useState(0);
    const [terminalCount, setTerminalCount] = useState(1);

    const activeFileSegments = useMemo(() => {
      if (!editorDocument) {
        return undefined;
      }

      return editorDocument.filePath.split('/');
    }, [editorDocument]);

    const activeFileUnsaved = useMemo(() => {
      return (
        editorDocument !== undefined &&
        unsavedFiles?.has(editorDocument.filePath)
      );
    }, [editorDocument, unsavedFiles]);

    useEffect(() => {
      const unsubscribeFromEventEmitter = shortcutEventEmitter.on(
        'toggleTerminal',
        () => {
          terminalToggledByShortcut.current = true;
        },
      );

      const unsubscribeFromThemeStore = useThemeStore.subscribe(
        (state, prevState) => {
          if (state.theme !== prevState.theme) {
            for (const ref of Object.values(terminalRefs.current)) {
              ref?.reloadStyles();
            }
          }
        },
      );

      return () => {
        unsubscribeFromEventEmitter();
        unsubscribeFromThemeStore();
      };
    }, []);

    useEffect(() => {
      const { current: terminal } = terminalPanelRef;

      if (!terminal) {
        return;
      }

      const isCollapsed = terminal.isCollapsed();

      if (!showTerminal && !isCollapsed) {
        terminal.collapse();
      } else if (showTerminal && isCollapsed) {
        terminal.resize(DEFAULT_TERMINAL_SIZE);
      }

      terminalToggledByShortcut.current = false;
    }, [showTerminal]);

    const addTerminal = () => {
      if (terminalCount < MAX_TERMINALS) {
        setTerminalCount(terminalCount + 1);
        setActiveTerminal(terminalCount);
      }
    };

    const removeTerminal = (indexToRemove: number) => {
      if (terminalCount > 1) {
        setTerminalCount(terminalCount - 1);
        if (activeTerminal === indexToRemove) {
          setActiveTerminal(Math.max(0, indexToRemove - 1));
        } else if (activeTerminal > indexToRemove) {
          setActiveTerminal(activeTerminal - 1);
        }
      }
    };

    return (
      <PanelGroup
        direction="vertical"
        className="bg-[var(--d-admin-surface-section)]"
      >
        <Panel
          defaultSize={showTerminal ? DEFAULT_EDITOR_SIZE : 100}
          minSize={20}
        >
          <PanelGroup direction="horizontal" style={{ touchAction: 'none' }}>
            <Panel
              ref={filePanelRef}
              defaultSize={PANEL_SIZES.FILE_TREE.default}
              minSize={PANEL_SIZES.FILE_TREE.min}
              collapsible
              onCollapse={() => setIsFilePanelCollapsed(true)}
              onExpand={() => setIsFilePanelCollapsed(false)}
            >
              <div className="bg-surface-0 flex h-full flex-col border-r border-[var(--d-admin-surface-border)]">
                <PanelHeader>
                  <Icon
                    icon="ph:tree-structure-duotone"
                    className="shrink-0 text-lg"
                  />
                  Files
                </PanelHeader>
                <FileTree
                  className="h-full"
                  files={files}
                  hideRoot
                  unsavedFiles={unsavedFiles}
                  rootFolder={WORK_DIR}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  hiddenFiles={IGNORE_PATTERNS_REGEX}
                />
              </div>
            </Panel>

            {isFilePanelCollapsed && (
              <div
                role="button"
                aria-label="Expand file panel"
                tabIndex={0}
                className="bg-surface-b hover:bg-surface-c focus:ring-primary absolute top-1/2 left-0 z-20 flex h-20 w-3 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border border-[var(--d-admin-surface-border)] transition-colors focus:ring-2 focus:outline-none"
                onClick={() => filePanelRef.current?.expand()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    filePanelRef.current?.expand();
                  }
                }}
                style={{ touchAction: 'none' }}
              >
                <div className="text-text-secondary text-sm">⋮</div>
              </div>
            )}

            <PanelResizeHandle
              className="group relative"
              style={{ touchAction: 'none' }}
            >
              <div className="absolute inset-0 z-10 flex w-2 items-center justify-center" />
            </PanelResizeHandle>
            <Panel
              className="flex flex-col"
              defaultSize={PANEL_SIZES.EDITOR.default}
              minSize={PANEL_SIZES.EDITOR.min}
            >
              <PanelHeader className="overflow-x-auto">
                <div className="flex flex-1 items-center text-sm">
                  {activeFileSegments?.length && (
                    <FileBreadcrumb
                      pathSegments={activeFileSegments}
                      files={files}
                      onFileSelect={onFileSelect}
                    />
                  )}
                  <div className="-mr-1.5 ml-auto flex items-center gap-1">
                    {activeFileUnsaved && (
                      <>
                        <PanelHeaderButton onClick={onFileSave}>
                          <Icon icon="ph:floppy-disk-duotone" />
                          Save
                        </PanelHeaderButton>
                        <PanelHeaderButton onClick={onFileReset}>
                          <Icon icon="ph:clock-counter-clockwise-duotone" />
                          Reset
                        </PanelHeaderButton>
                      </>
                    )}
                    <PanelHeaderButton
                      onClick={() =>
                        workbenchStore.toggleTerminal(!showTerminal)
                      }
                    >
                      <Icon icon="ph:terminal" />
                      Toggle Terminal
                    </PanelHeaderButton>
                  </div>
                </div>
              </PanelHeader>
              <div className="relative h-full flex-1 overflow-hidden">
                {activeFileSegments?.length ? (
                  <CodeMirrorEditor
                    theme={theme}
                    editable={!isStreaming && editorDocument !== undefined}
                    settings={EDITOR_SETTINGS}
                    doc={editorDocument}
                    autoFocusOnDocumentChange={!isMobile()}
                    onScroll={onEditorScroll}
                    onChange={onEditorChange}
                    onSave={onFileSave}
                  />
                ) : (
                  <div className="bg-surface-1 text-text-secondary absolute inset-0 flex flex-col items-center justify-center px-4 select-none">
                    <div className="mb-3 scale-75 opacity-50 md:mb-6 md:scale-125">
                      <EmptyStateIllustration />
                    </div>
                    <div className="space-y-1 text-center md:space-y-2">
                      <p className="text-text-primary text-base font-medium md:text-xl">
                        Select a file to edit
                      </p>
                      <p className="text-xs opacity-60 md:text-sm">
                        Choose a file from the explorer on the left
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle
          className="group relative"
          style={{ touchAction: 'none' }}
        >
          <div className="h- absolute inset-0 flex items-center justify-center" />
        </PanelResizeHandle>
        <Panel
          ref={terminalPanelRef}
          defaultSize={showTerminal ? DEFAULT_TERMINAL_SIZE : 0}
          minSize={10}
          collapsible
          onExpand={() => {
            if (!terminalToggledByShortcut.current) {
              workbenchStore.toggleTerminal(true);
            }
          }}
          onCollapse={() => {
            if (!terminalToggledByShortcut.current) {
              workbenchStore.toggleTerminal(false);
            }
          }}
        >
          <div className="h-full">
            <div className="bg-surface-0 flex h-full flex-col">
              <div className="bg-surface-b flex min-h-[34px] items-center gap-1.5 border-y border-[var(--d-admin-surface-border)] p-2">
                {Array.from({ length: terminalCount }, (_, index) => {
                  const isActive = activeTerminal === index;

                  return (
                    <div
                      key={index}
                      className={classNames(
                        'group flex h-full cursor-pointer items-center gap-1 rounded-full px-2 py-1.5 text-sm whitespace-nowrap transition-colors',
                        {
                          'bg-primary/10 text-primary': isActive,
                          'text-text-secondary hover:bg-surface-c bg-transparent':
                            !isActive,
                        },
                      )}
                      onClick={() => setActiveTerminal(index)}
                    >
                      <Icon
                        icon="ph:terminal-window-duotone"
                        className="text-base"
                      />
                      <span className="text-xs">
                        Terminal {terminalCount > 1 && index + 1}
                      </span>
                      {terminalCount > 1 && (
                        <button
                          className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTerminal(index);
                          }}
                        >
                          <Icon icon="ph:x" className="text-xs" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {terminalCount < MAX_TERMINALS && (
                  <IconButton icon="ph:plus" size="md" onClick={addTerminal} />
                )}
                <IconButton
                  className="ml-auto"
                  icon="ph:caret-down"
                  title="Close"
                  size="md"
                  onClick={() => workbenchStore.toggleTerminal(false)}
                />
              </div>
              {Array.from({ length: terminalCount }, (_, index) => {
                const isActive = activeTerminal === index;

                return (
                  <Terminal
                    key={index}
                    className={classNames('h-full overflow-hidden', {
                      hidden: !isActive,
                    })}
                    ref={(ref) => {
                      terminalRefs.current.push(ref);
                    }}
                    onTerminalReady={(terminal) =>
                      workbenchStore.attachTerminal(terminal)
                    }
                    onTerminalResize={(cols, rows) =>
                      workbenchStore.onTerminalResize(cols, rows)
                    }
                    theme={theme}
                  />
                );
              })}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    );
  },
);
