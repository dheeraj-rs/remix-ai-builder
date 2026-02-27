import { useEffect, useRef } from 'react';
import { useTerminalStore, usePreviewStore } from '../stores/zustand';
import { createScopedLogger } from '../utils/logger';

const logger = createScopedLogger('UseWebContainerListener');

export function useWebContainerListener() {
  const webcontainerPromise = useTerminalStore((state) => state.webcontainer);
  const initialized = useRef(false);

  useEffect(() => {
    if (!webcontainerPromise || initialized.current) return;

    logger.debug('Initializing WebContainer listener');
    initialized.current = true;

    webcontainerPromise.then((webcontainer) => {
      webcontainer.on('server-ready', (port, url) => {
        logger.info('Server ready event received:', { port, url });
        usePreviewStore.getState().setPreviews([
          {
            baseUrl: url,
            port,
            ready: true,
            icon: 'ph:globe-duotone',
            title: 'Application',
          },
        ]);
        usePreviewStore.getState().setActivePreviewIndex(0);
        usePreviewStore.getState().setUrl(url);
        usePreviewStore.getState().setIframeUrl(url);
      });

      webcontainer.on('error', (error) => {
        logger.error('WebContainer error:', error);
      });
    });
  }, [webcontainerPromise]);
}
