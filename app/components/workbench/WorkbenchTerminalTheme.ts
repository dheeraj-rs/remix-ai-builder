import type { ITheme } from '@xterm/xterm';

export function getTerminalTheme(overrides?: ITheme): ITheme {
  const cssVar = (token: string) => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    return (
      getComputedStyle(document.documentElement).getPropertyValue(token) ||
      undefined
    );
  };

  return {
    cursor: cssVar('--dev-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--dev-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--dev-elements-terminal-textColor'),
    background: cssVar('--dev-elements-terminal-backgroundColor'),
    selectionBackground: cssVar(
      '--dev-elements-terminal-selection-backgroundColor',
    ),
    selectionForeground: cssVar('--dev-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar(
      '--dev-elements-terminal-selection-backgroundColorInactive',
    ),
    black: cssVar('--dev-elements-terminal-color-black'),
    red: cssVar('--dev-elements-terminal-color-red'),
    green: cssVar('--dev-elements-terminal-color-green'),
    yellow: cssVar('--dev-elements-terminal-color-yellow'),
    blue: cssVar('--dev-elements-terminal-color-blue'),
    magenta: cssVar('--dev-elements-terminal-color-magenta'),
    cyan: cssVar('--dev-elements-terminal-color-cyan'),
    white: cssVar('--dev-elements-terminal-color-white'),
    brightBlack: cssVar('--dev-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--dev-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--dev-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--dev-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--dev-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--dev-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--dev-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--dev-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
