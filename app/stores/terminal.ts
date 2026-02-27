import type { WebContainer } from '@webcontainer/api';
import type { ITerminal } from '../types/terminal';
import { useTerminalStore } from './zustand';

export class TerminalStore {
  #webcontainer: Promise<WebContainer>;

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
  }

  get showTerminal() {
    return useTerminalStore.getState().showTerminal;
  }

  toggleTerminal(value?: boolean) {
    useTerminalStore.getState().toggleTerminal(value);
  }

  async attachTerminal(terminal: ITerminal) {
    useTerminalStore.getState().attachTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    useTerminalStore.getState().onTerminalResize(cols, rows);
  }

  reset() {
    useTerminalStore.getState().reset();
  }
}
