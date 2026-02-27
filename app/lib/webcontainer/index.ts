import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '../../utils/constants';
import { RemoteWebContainer } from '../remote-execution-adapter';

interface WebContainerContext {
  loaded: boolean;
}

declare global {
  interface Window {
    __webcontainerContext?: WebContainerContext;
    __webcontainer?: Promise<WebContainer>;
  }
}

export const webcontainerContext: WebContainerContext =
  typeof window !== 'undefined' && window.__webcontainerContext
    ? window.__webcontainerContext
    : { loaded: false };

if (typeof window !== 'undefined') {
  window.__webcontainerContext = webcontainerContext;
}

let resolveWebcontainer!: (
  value: WebContainer | PromiseLike<WebContainer>,
) => void;
export const webcontainer = new Promise<WebContainer>((resolve) => {
  resolveWebcontainer = resolve;
});

if (typeof window !== 'undefined') {
  const cachedWebContainer = window.__webcontainer;
  if (cachedWebContainer) {
    cachedWebContainer.then(resolveWebcontainer);
  } else {
    const bootPromise = Promise.resolve()
      .then(() => {
        console.log('[WebContainer] Booting RemoteWebContainer...');
        return RemoteWebContainer.boot();
      })
      .then((bootedWebcontainer) => {
        webcontainerContext.loaded = true;
        return bootedWebcontainer as any;
      });

    bootPromise.then(resolveWebcontainer);
    window.__webcontainer = bootPromise;
  }
}
