'use client';

import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { Theme } from '../../stores/zustand';
import { createScopedLogger } from '../../utils/logger';
import { getTerminalTheme } from './WorkbenchTerminalTheme';

const logger = createScopedLogger('Terminal');

export interface TerminalRef {
  reloadStyles: () => void;
}

export interface TerminalProps {
  className?: string;
  theme: Theme;
  readonly?: boolean;
  onTerminalReady?: (terminal: XTerm) => void;
  onTerminalResize?: (cols: number, rows: number) => void;
}

export const Terminal = memo(
  forwardRef<TerminalRef, TerminalProps>(
    (
      { className, theme, readonly, onTerminalReady, onTerminalResize },
      ref,
    ) => {
      const terminalElementRef = useRef<HTMLDivElement>(null);
      const terminalRef = useRef<XTerm | null>(null);

      useEffect(() => {
        const element = terminalElementRef.current!;

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        const terminal = new XTerm({
          cursorBlink: true,
          convertEol: true,
          disableStdin: readonly,
          theme: getTerminalTheme(readonly ? { cursor: '#00000000' } : {}),
          fontSize: 12,
          fontFamily: 'Menlo, courier-new, courier, monospace',
        });

        terminalRef.current = terminal;

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(element);

        let resizeTimeout: any;

        const resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }

          resizeTimeout = setTimeout(() => {
            fitAddon.fit();
            onTerminalResize?.(terminal.cols, terminal.rows);
          }, 100);
        });

        resizeObserver.observe(element);

        logger.info('Attach terminal');

        onTerminalReady?.(terminal);

        return () => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          resizeObserver.disconnect();
          terminal.dispose();
        };
      }, []);

      useEffect(() => {
        const terminal = terminalRef.current!;
        terminal.options.theme = getTerminalTheme(
          readonly ? { cursor: '#00000000' } : {},
        );

        terminal.options.disableStdin = readonly;
      }, [theme, readonly]);

      useImperativeHandle(ref, () => {
        return {
          reloadStyles: () => {
            const terminal = terminalRef.current!;
            terminal.options.theme = getTerminalTheme(
              readonly ? { cursor: '#00000000' } : {},
            );
          },
        };
      }, []);

      return <div className={className} ref={terminalElementRef} />;
    },
  ),
);
