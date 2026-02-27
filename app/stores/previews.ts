import type { WebContainer } from '@webcontainer/api';
import { usePreviewStore } from './zustand';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
  icon?: string;
  title?: string;
}

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    this.#init();
  }

  get previews() {
    return usePreviewStore.getState().previews;
  }

  async #init() {
    const webcontainer = await this.#webcontainer;

    if (!webcontainer) {
      console.error('[PreviewsStore] WebContainer is undefined!');
      return;
    }

    usePreviewStore.getState().setPreviews([]);
    usePreviewStore.getState().setIframeUrl(undefined);
    usePreviewStore.getState().setActivePreviewIndex(0);

    webcontainer.on('port', (port, type, url) => {
      console.log('[PreviewsStore] Port event:', { port, type, url });
      let previewInfo = this.#availablePreviews.get(port);

      if (type === 'close' && previewInfo) {
        console.log('[PreviewsStore] Closing preview on port:', port);
        this.#availablePreviews.delete(port);
        const currentPreviews = usePreviewStore.getState().previews;
        usePreviewStore
          .getState()
          .setPreviews(
            currentPreviews.filter((preview) => preview.port !== port),
          );

        return;
      }

      if (!previewInfo) {
        console.log('[PreviewsStore] Creating new preview for port:', port);
        previewInfo = { port, ready: type === 'open', baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
      } else {
        previewInfo.ready = type === 'open';
        previewInfo.baseUrl = url;
        this.#availablePreviews.set(port, previewInfo);
      }

      const updatedPreviews = Array.from(this.#availablePreviews.values());

      console.log('[PreviewsStore] Updated previews:', updatedPreviews);
      usePreviewStore.getState().setPreviews(updatedPreviews);

      if (type === 'open' && url) {
        const currentUrl = usePreviewStore.getState().iframeUrl;
        if (currentUrl !== url) {
          console.log('[PreviewsStore] Setting iframe URL:', url);
          usePreviewStore.getState().setIframeUrl(url);
        }
      }
    });
  }

  async killPort(port: number) {
    const webcontainer = await this.#webcontainer;
    if (!webcontainer) return;

    console.log('[PreviewsStore] Killing port:', port);
    this.#availablePreviews.delete(port);
    const currentPreviews = usePreviewStore.getState().previews;
    const updatedPreviews = currentPreviews.filter((p) => p.port !== port);
    usePreviewStore.getState().setPreviews(updatedPreviews);
    const activeIndex = usePreviewStore.getState().activePreviewIndex;
    const activePort = currentPreviews[activeIndex]?.port;
    if (activePort === port) {
      usePreviewStore.getState().setActivePreviewIndex(0);
      const firstRemaining = updatedPreviews[0];
      if (firstRemaining) {
        usePreviewStore.getState().setIframeUrl(firstRemaining.baseUrl);
        usePreviewStore.getState().setUrl(firstRemaining.baseUrl);
      } else {
        usePreviewStore.getState().setIframeUrl(undefined);
        usePreviewStore.getState().setUrl('');
      }
    }

    try {
      await webcontainer.spawn('fuser', ['-k', '-n', 'tcp', port.toString()]);
      const lsofProcess = await webcontainer.spawn('sh', [
        '-c',
        `lsof -i :${port} -t | xargs kill -9`,
      ]);
      await lsofProcess.exit;
      await webcontainer.spawn('npx', ['-y', 'kill-port', port.toString()]);
    } catch (error) {
      console.error('[PreviewsStore] Failed to kill port:', error);
    }
  }

  reset() {
    this.#availablePreviews.clear();
    usePreviewStore.getState().reset();
  }
}
