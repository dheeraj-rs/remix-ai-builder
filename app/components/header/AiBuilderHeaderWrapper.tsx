import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '@iconify/react';
import { useIsMobile } from '~/core/hooks/use-mobile';
import { useAiBuilderStore } from '../../stores/ai-builder-store';
import { PortDropdown } from '../workbench/WorkbenchPortDropdown';
import { exportProjectAsZip } from '../../utils/zip';
import {
  useChatStore,
  useWorkbenchStore,
  usePreviewStore,
  useFilesStore,
  useEditorStore,
  useTerminalStore,
} from '../../stores/zustand';

import DeploymentModal from '../dialogs/DeploymentModal';
import SettingsModal from '../dialogs/SettingsModal';
import GitHubPushDialog from '../dialogs/GitHubPushDialog';
import { RemoteWebContainer } from '../../lib/remote-execution-adapter';
const useSession = () => ({ data: { user: null as { email?: string; id?: string } | null } });
import { useDeploymentStore } from '../../stores/deployment-store';

export function Header() {
  const navigate = useNavigate();
  const activeView = useWorkbenchStore((state) => state.currentView);
  const {
    activeMobilePanel,
    setActiveMobilePanel,
    isHistoryOpen,
    setIsHistoryOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
  } = useAiBuilderStore();
  const isMobile = useIsMobile();

  const getBuilderIcon = () => 'lucide:sparkles';
  const previews = usePreviewStore((state) => state.previews);
  const activePreviewIndex = usePreviewStore(
    (state) => state.activePreviewIndex,
  );
  const url = usePreviewStore((state) => state.url);
  const iframeUrl = usePreviewStore((state) => state.iframeUrl);
  const activePreview = previews[activePreviewIndex];

  const [displayUrl, setDisplayUrl] = useState('');
  useEffect(() => {
    if (!previews[activePreviewIndex] && previews.length > 0) {
      console.log('[Header] Active preview invalid, resetting to index 0');
      usePreviewStore.getState().setActivePreviewIndex(0);
    }
  }, [previews, activePreviewIndex]);

  const chatStarted = useChatStore((state) => state.started);
  const chatDescription = useChatStore((state) => state.description);
  const showHistory = useChatStore((state) => state.showHistory);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const [isGitHubPushDialogOpen, setIsGitHubPushDialogOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const { data: session } = useSession();
  const params = useParams();
  const chatId = params?.id as string | undefined;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeUserId = session?.user?.email || session?.user?.id;
      let guestSessionId = localStorage.getItem('d_admin_guest_session_id');
      
      if (!guestSessionId) {
        guestSessionId = uuidv4();
        localStorage.setItem('d_admin_guest_session_id', guestSessionId);
      }

      const isolationId = activeUserId || `guest_${guestSessionId}`;
      RemoteWebContainer.activeInstance?.setUserId(isolationId);
    }

    if (previews.length === 0) {
      setDisplayUrl('');
      return;
    }

    const currentPreview = previews[activePreviewIndex];
    if (!currentPreview) return;
    const normalizedBase = currentPreview.baseUrl.replace(/\/$/, '');
    if (url.startsWith(normalizedBase)) {
      let path = url.slice(normalizedBase.length);
      if (!path.startsWith('/')) path = '/' + path;
      setDisplayUrl(path);
    } else if (url.includes('://')) {
      try {
        const urlObj = new URL(url);
        let path = urlObj.pathname + urlObj.search + urlObj.hash;
        const proxyMatch = path.match(/^\/proxy\/\d+(\/.*)?$/);
        if (proxyMatch) {
          path = proxyMatch[1] || '/';
        }
        setDisplayUrl(path);
      } catch (e) {
        setDisplayUrl(url);
      }
    } else {
      setDisplayUrl(url.startsWith('/') ? url : '/' + url);
    }
  }, [url, activePreviewIndex, previews]);

  useEffect(() => {
    if (activePreview) {
      if (!url) {
        usePreviewStore.getState().setUrl(activePreview.baseUrl);
      }
      if (activePreview.baseUrl !== iframeUrl && !iframeUrl) {
        usePreviewStore.getState().setIframeUrl(activePreview.baseUrl);
      }
    }
  }, [activePreview]);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <header className="flex h-[var(--header-height)] w-full shrink-0 items-center pr-3 pl-2 select-none border-b border-[var(--d-admin-surface-border)]">
      <div className="flex w-full max-w-[55%] min-w-0 flex-1 items-center gap-2 md:max-w-[40.5%]">
        <button
          onClick={() => navigate(-1)}
          className="hidden md:flex items-center justify-center font-medium shrink-0 min-w-0 max-w-full rounded-md focus-visible:outline-2 disabled:op-50 relative disabled:cursor-not-allowed gap-1 h-8 focus-visible:outline-[var(--d-admin-blue-600)] bg-[var(--d-admin-surface-section)] border border-[var(--d-admin-surface-border)] enabled:hover:bg-[var(--d-admin-surface-hover)] text-[var(--d-admin-text-color)] text-sm px-2 -mr-px transition-colors"
          type="button"
        >
          <Icon icon="ph:caret-left" className="size-5" />
        </button>
        <button
          className={`flex items-center justify-center font-medium shrink-0 min-w-0 max-w-full rounded-md focus-visible:outline-2 disabled:op-50 relative disabled:cursor-not-allowed gap-1 h-8 focus-visible:outline-[var(--d-admin-blue-600)] bg-transparent enabled:hover:bg-[var(--d-admin-surface-hover)] text-[var(--d-admin-text-color)] text-sm px-2 -mr-px ${isHistoryOpen ? 'bg-[var(--d-admin-surface-hover)]' : ''}`}
          type="button"
          onClick={() => {
            setIsHistoryOpen(!isHistoryOpen);
            useChatStore.getState().setShowHistory(!showHistory);
          }}
        >
          <Icon icon="ph:clock-counter-clockwise" className="size-5" />
        </button>
        <span className="mx-1 text-xl text-[var(--d-admin-text-color)] antialiased opacity-[.12]">
          /
        </span>
        <button
          className={`flex-1 md:flex-none flex items-center justify-center font-medium min-w-0 rounded-md focus-visible:outline-2 disabled:op-50 relative disabled:cursor-not-allowed gap-1 h-8 focus-visible:outline-[var(--d-admin-blue-600)] bg-transparent enabled:hover:bg-[var(--d-admin-surface-hover)] text-[var(--d-admin-text-color)] text-sm px-2 -mr-px ${isMobile && activeMobilePanel === 'workbench' ? 'hidden' : 'flex'}`}
          type="button"
        >
          <span className="max-w-full truncate md:max-w-md lg:max-w-lg">
            {chatStarted ? (
              <span className="text-primary flex-1 truncate text-center">
                {chatDescription}
              </span>
            ) : (
              'New Project'
            )}
          </span>
        </button>
        <div className="relative ml-2 shrink-0 items-center gap-2">
          <button
            onClick={() => {
              RemoteWebContainer.activeInstance?.teardown();
              RemoteWebContainer.activeInstance?.mount({});
              useChatStore.getState().reset();
              useWorkbenchStore.getState().reset();
              useFilesStore.getState().reset();
              useEditorStore.getState().reset();
              usePreviewStore.getState().reset();
              useTerminalStore.getState().reset();
              try {
                localStorage.removeItem('chat-store-storage');
                localStorage.removeItem('preview-store-storage');
                localStorage.removeItem('files-store-storage');
                localStorage.removeItem('editor-store-storage');
                localStorage.removeItem('workbench-storage');
              } catch (e) {
                // ignore storage errors
              }
              navigate('/ai-website-builder');
            }}
            className="flex items-center justify-center font-medium shrink-0 min-w-0 rounded-md focus-visible:outline-2 gap-1.5 h-8 bg-[var(--d-admin-surface-section)] hover:bg-[var(--d-admin-surface-hover)] border border-[var(--d-admin-surface-border)] text-[var(--d-admin-text-color)] text-xs px-3 transition-colors"
            title="Start New Chat"
            type="button"
          >
            <Icon
              icon={getBuilderIcon()}
              className="size-3.5 text-[var(--d-admin-text-color-secondary)]"
            />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="pointer-events-auto ml-auto flex w-auto shrink-0 items-center gap-2 md:w-full md:max-w-[59.5%]">
        <div className="relative flex min-h-[var(--panel-header-height)] w-auto items-center justify-end gap-2 py-2 pl-0 md:w-full">
          {isMobile && (
            <div className="mr-0 flex items-center gap-2">
              <div className="flex shrink-0 flex-wrap items-center overflow-hidden rounded-xl border border-[var(--d-admin-surface-border)] p-1">
                <button
                  onClick={() => {
                    const newPanel =
                      activeMobilePanel === 'chat' ? 'workbench' : 'chat';
                    setActiveMobilePanel(newPanel);
                  }}
                  className="relative rounded-full bg-transparent px-2.5 py-1 text-sm text-[var(--d-admin-text-color)] cursor-pointer"
                >
                  <span className="relative z-10 flex items-center font-medium">
                    <Icon
                      icon={
                        activeMobilePanel === 'chat'
                          ? 'lucide:code'
                          : 'lucide:message-square'
                      }
                      className="size-4"
                    />
                  </span>
                </button>
              </div>
            </div>
          )}

          {(!isMobile || activeMobilePanel === 'workbench') && (
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-[var(--d-admin-surface-border)] p-0.5 h-8">
                <button
                  onClick={() =>
                    useWorkbenchStore.getState().setCurrentView('preview')
                  }
                  className={`relative h-full cursor-pointer flex items-center justify-center rounded-sm bg-transparent px-2.5 text-sm ${activeView === 'preview' ? 'text-[var(--d-admin-text-color)]' : 'text-[var(--d-admin-text-color-secondary)] hover:text-[var(--d-admin-text-color)]'}`}
                >
                  <span className="relative z-10 flex items-center gap-1.5 font-medium">
                    <Icon icon="lucide:eye" className="size-4" />
                    <span className="hidden md:inline-block">Preview</span>
                  </span>
                  {activeView === 'preview' && (
                    <span
                      className="absolute inset-0 z-0 rounded-sm bg-[var(--d-admin-surface-hover)]"
                      style={{ opacity: 1 }}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() =>
                    useWorkbenchStore.getState().setCurrentView('code')
                  }
                  className={`relative h-full cursor-pointer flex items-center justify-center rounded-sm bg-transparent px-2.5 text-sm ${activeView === 'code' ? 'text-[var(--d-admin-text-color)]' : 'text-[var(--d-admin-text-color-secondary)] hover:text-[var(--d-admin-text-color)]'}`}
                >
                  <span className="relative z-10 flex items-center gap-1.5 font-medium">
                    <Icon icon="lucide:code" className="size-4" />
                    <span className="hidden md:inline-block">Code</span>
                  </span>
                  {activeView === 'code' && (
                    <span
                      className="absolute inset-0 z-0 rounded-sm bg-[var(--d-admin-surface-hover)]"
                      style={{ opacity: 1 }}
                    ></span>
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="hidden w-full flex-1 items-center justify-center md:flex">
            <div className="builder-topbar-center mx-auto hidden w-full max-w-[400px] flex-1 md:flex items-center gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex shrink-0 items-center justify-center rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1.5 transition-colors hover:bg-[var(--d-admin-surface-hover)] h-8 w-8"
                title="Project Settings"
              >
                <Icon
                  icon="ph:gear-duotone"
                  className="size-5 text-[var(--d-admin-text-color-secondary)]"
                />
              </button>
              <div className="relative flex h-8 w-full items-center rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] px-3">
                {activePreview && (
                  <div className="mr-2">
                    <PortDropdown
                      activePreviewIndex={activePreviewIndex}
                      setActivePreviewIndex={(index) =>
                        usePreviewStore.getState().setActivePreviewIndex(index)
                      }
                      isDropdownOpen={isDropdownOpen}
                      setIsDropdownOpen={setIsDropdownOpen}
                      setHasSelectedPreview={() => {}}
                      previews={previews}
                    />
                  </div>
                )}
                {!activePreview && (
                  <Icon
                    icon="ph:lock-key-duotone"
                    className="mr-2 text-gray-400"
                  />
                )}
                <input
                  className="text-color hidden w-full bg-transparent text-sm outline-none md:block"
                  type="text"
                  value={displayUrl}
                  onChange={(e) => setDisplayUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!activePreview) return;
                      const normalizedBase = activePreview.baseUrl.replace(/\/$/, '');
                      let targetUrl = displayUrl.trim();
                      if (targetUrl.startsWith('/')) {
                        targetUrl = `${normalizedBase}${targetUrl}`;
                      }
                      else if (
                        !targetUrl.includes('://') &&
                        !targetUrl.startsWith('/')
                      ) {
                        targetUrl = `${normalizedBase}/${targetUrl}`;
                      }
                      else if (!targetUrl.startsWith(normalizedBase)) {
                        const normalizedPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
                        targetUrl = `${normalizedBase}${normalizedPath}`;
                      }
                      usePreviewStore.getState().setUrl(targetUrl);

                      if (targetUrl.startsWith(normalizedBase)) {
                        const path = targetUrl.slice(normalizedBase.length) || '/';
                        if (!usePreviewStore.getState().iframeUrl) {
                          usePreviewStore.getState().setIframeUrl(targetUrl);
                        } else {
                          usePreviewStore.getState().setNavigationCommand(path);
                        }
                      } else {
                        usePreviewStore.getState().setIframeUrl(targetUrl);
                      }
                    }
                  }}
                  placeholder="/"
                />
                <div className="ml-2 flex items-center gap-1">
                  <button
                    className="rounded-md p-1 text-[var(--d-admin-text-color-secondary)] transition-colors hover:bg-[var(--d-admin-surface-hover)] hover:text-[var(--d-admin-text-color)]"
                    onClick={() => {
                      usePreviewStore.getState().setIframeUrl(url);
                      usePreviewStore.getState().refreshPreview();
                    }}
                    title="Refresh Preview"
                  >
                    <Icon icon="ph:arrow-clockwise" className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto hidden gap-3 md:flex">
            <div className="relative">
              <button
                className="disabled:op-50 gap-1.7 relative flex h-8 max-w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] px-3 text-sm font-medium text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--d-admin-blue-600)] disabled:cursor-not-allowed"
                type="button"
                onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                title="Share"
              >
                {' '}
                <Icon icon="ph:share-fat-duotone" className="text-lg" />
                <span>Share</span>
              </button>
              {isShareDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsShareDropdownOpen(false)}
                  ></div>
                  <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-2 flex w-56 flex-col overflow-hidden rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1 shadow-xl duration-100">
                    {useDeploymentStore.getState().deploymentUrl && (
                      <div className="px-3 py-2 border-b border-[var(--d-admin-surface-border)] mb-1">
                        <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          <span>Project Published</span>
                        </div>
                        <a
                          href={useDeploymentStore.getState().deploymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[var(--d-admin-text-color-secondary)] hover:text-[var(--d-admin-text-color)] hover:underline truncate block mt-0.5"
                        >
                          {useDeploymentStore
                            .getState()
                            .deploymentUrl.replace('https://', '')}
                        </a>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const files = useFilesStore.getState().files;
                        exportProjectAsZip(files);
                        setIsShareDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                    >
                      <Icon icon="ph:file-zip-duotone" className="size-4" />
                      <span>Download ZIP</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsGitHubPushDialogOpen(true);
                        setIsShareDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                    >
                      <Icon icon="ph:github-logo-duotone" className="size-4" />
                      <span>Push to GitHub</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="disabled:op-50 gap-1.7 relative flex h-8 max-w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] px-3 text-sm font-medium text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--d-admin-blue-600)] disabled:cursor-not-allowed"
              title="Deploy to Vercel"
              onClick={() => setIsDeployModalOpen(true)}
            >
              {' '}
              <Icon icon="ph:rocket-launch-duotone" className="text-lg" />
              <span>Publish</span>
            </button>
          </div>

          <div className="relative md:hidden">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex h-9 w-9 items-center justify-center cursor-pointer rounded-md text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)] ${isMoreMenuOpen ? 'bg-[var(--d-admin-surface-hover)]' : ''}`}
            >
              <Icon icon="ph:dots-three-vertical-bold" className="size-5" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                ></div>
                <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-[100] mt-2 flex w-56 flex-col overflow-hidden rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1 shadow-xl duration-100">
                  <button
                    onClick={() => {
                      const files = useFilesStore.getState().files;
                      exportProjectAsZip(files);
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                  >
                    <Icon icon="ph:download-duotone" className="size-4" />
                    <span>Export as ZIP</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsDeployModalOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
                  >
                    <Icon icon="ph:rocket-launch-duotone" className="size-4" />
                    <span>Publish</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {isDeployModalOpen && (
        <DeploymentModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          chatId={chatId}
        />
      )}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
      {isGitHubPushDialogOpen && (
        <GitHubPushDialog
          isOpen={isGitHubPushDialogOpen}
          onClose={() => setIsGitHubPushDialogOpen(false)}
        />
      )}
    </header>
  );
}
