import { memo, useRef, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  usePreviewStore,
  useChatStore,
  useFilesStore,
} from '../../stores/zustand';
import { useAiBuilderStore } from '../../stores/ai-builder-store';

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeUrl = usePreviewStore((state) => state.iframeUrl);
  const isLoading = useChatStore((state) => state.isLoading);
  const filesCount = useFilesStore((state) => state.filesCount);
  const refreshTrigger = usePreviewStore((state) => state.refreshTrigger);
  const previews = usePreviewStore((state) => state.previews);
  const activePreviewIndex = usePreviewStore(
    (state) => state.activePreviewIndex,
  );
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const isSelectionMode = useAiBuilderStore((state) => state.isSelectionMode);
  const setSelectionMode = useAiBuilderStore((state) => state.setSelectionMode);
  const setSelectedElement = useAiBuilderStore(
    (state) => state.setSelectedElement,
  );

  useEffect(() => {
    setIsSecureContext(window.crossOriginIsolated);
  }, []);

  useEffect(() => {
    if (iframeUrl) {
      setIsIframeLoading(true);
    }
  }, [iframeUrl, refreshTrigger]);

  useEffect(() => {
    const activePreview = previews[activePreviewIndex];
    if (activePreview && !iframeUrl) {
      usePreviewStore.getState().setIframeUrl(activePreview.baseUrl);
      usePreviewStore.getState().setUrl(activePreview.baseUrl);
    }
  }, [previews, activePreviewIndex, iframeUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'TOGGLE_SELECTION',
          enabled: isSelectionMode,
        },
        '*',
      );
    }
  }, [isSelectionMode, iframeUrl, refreshTrigger]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const activePreview = previews[activePreviewIndex];
      if (!activePreview) return;
      if (event.data && event.data.type === 'ROUTE_CHANGE') {
        const newPath = event.data.path;
        const normalizedBase = activePreview.baseUrl.replace(/\/$/, '');
        const normalizedPath = newPath.startsWith('/') ? newPath : `/${newPath}`;
        const newUrl = `${normalizedBase}${normalizedPath}`;

        console.log('[WorkbenchPreview] Route changed to:', newPath);

        usePreviewStore.getState().setUrl(newUrl);
      }

      if (event.data && event.data.type === 'ELEMENT_SELECTED') {
        const { element } = event.data;
        setSelectedElement(element);
        setSelectionMode(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [previews, activePreviewIndex]);

  const navigationCommand = usePreviewStore((state) => state.navigationCommand);

  useEffect(() => {
    if (navigationCommand && iframeRef.current?.contentWindow) {
      console.log(
        '[WorkbenchPreview] Executing navigation command via postMessage:',
        navigationCommand,
      );

      const win = iframeRef.current.contentWindow;
      const path = navigationCommand;

      win.postMessage({ type: 'NAVIGATE', path }, '*');

      usePreviewStore.getState().setNavigationCommand(null);
    }
  }, [navigationCommand]);

  const isGenerating = isLoading;
  const isStartingServer = !isLoading && !iframeUrl && filesCount > 0;
  const showIframe = !!iframeUrl;

  return (
    <div className="bg-surface-0 flex h-full w-full flex-col relative">
      <div className="relative h-full w-full flex-1">
        {showIframe && (
          <iframe
            key={refreshTrigger}
            ref={iframeRef}
            className={`absolute inset-0 h-full w-full border-none transition-opacity duration-300 ${
              isIframeLoading ? 'opacity-0' : 'opacity-100'
            }`}
            src={iframeUrl}
            allow="clipboard-read; clipboard-write"
            onLoad={() => setIsIframeLoading(false)}
            onError={(e) => setIsIframeLoading(false)}
          />
        )}

        {(isGenerating || isStartingServer || isIframeLoading) && (
          <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-4 text-center bg-surface-0 z-10">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Icon
                icon="ph:code-duotone"
                className="h-8 w-8 text-primary animate-pulse"
              />
              <div className="absolute inset-0 rounded-xl border-2 border-primary/20 animate-ping opacity-20"></div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-[var(--d-admin-text-color)]">
                {isGenerating
                  ? 'Generating Code...'
                  : isStartingServer
                    ? 'Starting Server...'
                    : 'Loading Preview...'}
              </h3>
              <p className="text-sm text-[var(--d-admin-text-color-secondary)]">
                {isGenerating
                  ? 'The AI is building your website.'
                  : isStartingServer
                    ? `Setting up development environment (${filesCount} files generated)...`
                    : 'rendering the application...'}
              </p>
            </div>
          </div>
        )}

        {!isGenerating && !isStartingServer && !showIframe && (
          <div className="text-text-secondary flex h-full w-full items-center justify-center">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
});

Preview.displayName = 'Preview';
