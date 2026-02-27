import { Compartment, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { Theme } from '../../stores/zustand';
import type { EditorSettings } from './CodeMirrorEditor';

export const darkTheme = EditorView.theme({}, { dark: true });
export const themeSelection = new Compartment();

export function getTheme(
  theme: Theme,
  settings: EditorSettings = {},
): Extension {
  return [
    getEditorTheme(settings),
    theme === 'dark'
      ? themeSelection.of([getDarkTheme()])
      : themeSelection.of([getLightTheme()]),
  ];
}

export function reconfigureTheme(theme: Theme) {
  return themeSelection.reconfigure(
    theme === 'dark' ? getDarkTheme() : getLightTheme(),
  );
}

function getEditorTheme(settings: EditorSettings) {
  return EditorView.theme({
    '&': {
      fontSize: settings.fontSize ?? '12px',
    },
    '&.cm-editor': {
      height: '100%',
      background: 'var(--d-admin-surface-ground)',
      color: 'var(--d-admin-text-color)',
    },
    '.cm-cursor': {
      borderLeft: '2px solid var(--d-admin-text-color-secondary)',
    },
    '.cm-scroller': {
      lineHeight: '1.5',
      '&:focus-visible': {
        outline: 'none',
      },
    },
    '.cm-line': {
      padding: '0 0 0 4px',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
      {
        backgroundColor: 'var(--d-admin-blue-600) !important',
        opacity: '0.3',
      },
    '&:not(.cm-focused) > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
      {
        backgroundColor: 'var(--d-admin-blue-200)',
        opacity: '0.3',
      },
    '&.cm-focused > .cm-scroller .cm-matchingBracket': {
      backgroundColor: 'var(--d-admin-surface-hover)',
    },
    '.cm-activeLine': {
      background: 'var(--d-admin-surface-hover)',
    },
    '.cm-gutters': {
      background: 'var(--d-admin-surface-ground)',
      borderRight: 0,
      color: 'var(--d-admin-text-color-secondary)',
    },
    '.cm-gutter': {
      '&.cm-lineNumbers': {
        fontFamily: 'Roboto Mono, monospace',
        fontSize: settings.gutterFontSize ?? settings.fontSize ?? '12px',
        minWidth: '40px',
      },
      '& .cm-activeLineGutter': {
        background: 'transparent',
        color: 'var(--d-admin-text-color-secondary)',
      },
      '&.cm-foldGutter .cm-gutterElement > .fold-icon': {
        cursor: 'pointer',
        color: 'var(--d-admin-text-color-secondary)',
        transform: 'translateY(2px)',
        '&:hover': {
          color: 'var(--d-admin-text-color-secondary)',
        },
      },
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
    },
    '.cm-tooltip-autocomplete > ul > li': {
      minHeight: '18px',
    },
    '.cm-panel.cm-search label': {
      marginLeft: '2px',
      fontSize: '12px',
    },
    '.cm-panel.cm-search .cm-button': {
      fontSize: '12px',
    },
    '.cm-panel.cm-search .cm-textfield': {
      fontSize: '12px',
    },
    '.cm-panel.cm-search input[type=checkbox]': {
      position: 'relative',
      transform: 'translateY(2px)',
      marginRight: '4px',
    },
    '.cm-panels': {
      borderColor: 'var(--d-admin-surface-border)',
    },
    '.cm-panels-bottom': {
      borderTop: '1px solid var(--d-admin-surface-border)',
      backgroundColor: 'transparent',
    },
    '.cm-panel.cm-search': {
      background: 'var(--d-admin-surface-ground)',
      color: 'var(--d-admin-text-color-secondary)',
      padding: '8px',
    },
    '.cm-search .cm-button': {
      background: 'transparent',
      borderColor: 'transparent',
      color: 'var(--d-admin-text-color-secondary)',
      borderRadius: '4px',
      '&:hover': {
        color: 'var(--d-admin-text-color)',
      },
      '&:focus-visible': {
        outline: 'none',
        borderColor: 'var(--d-admin-blue-600)',
      },
      '&:hover:not(:focus-visible)': {
        background: 'var(--d-admin-surface-hover)',
        borderColor: 'transparent',
      },
      '&:hover:focus-visible': {
        background: 'var(--d-admin-surface-hover)',
        borderColor: 'var(--d-admin-blue-600)',
      },
    },
    '.cm-panel.cm-search [name=close]': {
      top: '6px',
      right: '6px',
      padding: '0 6px',
      fontSize: '1rem',
      backgroundColor: 'transparent',
      color: 'var(--d-admin-text-color-secondary)',
      '&:hover': {
        'border-radius': '6px',
        color: 'var(--d-admin-text-color)',
        backgroundColor: 'var(--d-admin-surface-hover)',
      },
    },
    '.cm-search input': {
      background: 'transparent',
      borderColor: 'var(--d-admin-surface-border)',
      color: 'var(--d-admin-text-color)',
      outline: 'none',
      borderRadius: '4px',
      '&:focus-visible': {
        borderColor: 'var(--d-admin-blue-600)',
      },
    },
    '.cm-tooltip': {
      background: 'var(--d-admin-surface-ground)',
      border: '1px solid transparent',
      borderColor: 'var(--d-admin-surface-border)',
      color: 'var(--d-admin-text-color)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'var(--d-admin-surface-hover)',
      color: 'var(--d-admin-text-color)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'var(--d-admin-surface-d)',
    },
    '.cm-tooltip.cm-readonly-tooltip': {
      padding: '4px',
      whiteSpace: 'nowrap',
      backgroundColor: 'var(--d-admin-surface-section)',
      borderColor: 'var(--d-admin-surface-border)',
      '& .cm-tooltip-arrow:before': {
        borderTopColor: 'var(--d-admin-surface-border)',
      },
      '& .cm-tooltip-arrow:after': {
        borderTopColor: 'transparent',
      },
    },
  });
}

function getLightTheme() {
  return vscodeLight;
}

function getDarkTheme() {
  return vscodeDark;
}
