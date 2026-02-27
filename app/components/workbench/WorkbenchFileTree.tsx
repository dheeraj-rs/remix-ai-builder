import { Icon } from '@iconify/react';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FileMap } from '../../stores/files';
import { classNames } from '../../utils/classNames';
import { createScopedLogger, renderLogger } from '../../utils/logger';
import { FileTreeIllustration } from './WorkbenchFileTreeIllustration';

const logger = createScopedLogger('FileTree');

const NODE_PADDING_LEFT = 8;
const DEFAULT_HIDDEN_FILES = [/\/node_modules\//, /\/\.next/, /\/\.astro/];

interface Props {
  files?: FileMap;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
  rootFolder?: string;
  hideRoot?: boolean;
  collapsed?: boolean;
  allowFolderSelection?: boolean;
  hiddenFiles?: Array<string | RegExp>;
  unsavedFiles?: Set<string>;
  className?: string;
}

export const FileTree = memo(
  ({
    files = {},
    onFileSelect,
    selectedFile,
    rootFolder,
    hideRoot = false,
    collapsed = false,
    allowFolderSelection = false,
    hiddenFiles,
    className,
    unsavedFiles,
  }: Props) => {
    renderLogger.trace('FileTree');

    const computedHiddenFiles = useMemo(
      () => [...DEFAULT_HIDDEN_FILES, ...(hiddenFiles ?? [])],
      [hiddenFiles],
    );

    const fileList = useMemo(() => {
      return buildFileList(files, rootFolder, hideRoot, computedHiddenFiles);
    }, [files, rootFolder, hideRoot, computedHiddenFiles]);

    const [collapsedFolders, setCollapsedFolders] = useState(() => {
      return collapsed
        ? new Set(
            fileList
              .filter((item) => item.kind === 'folder')
              .map((item) => item.fullPath),
          )
        : new Set<string>();
    });

    useEffect(() => {
      if (collapsed) {
        setCollapsedFolders((prevCollapsed) => {
          const newCollapsed = new Set(
            fileList
              .filter((item) => item.kind === 'folder')
              .map((item) => item.fullPath),
          );

          if (prevCollapsed.size !== newCollapsed.size) {
            return newCollapsed;
          }

          for (const folder of newCollapsed) {
            if (!prevCollapsed.has(folder)) {
              return newCollapsed;
            }
          }

          return prevCollapsed;
        });
        return;
      }

      setCollapsedFolders((prevCollapsed) => {
        const newCollapsed = new Set<string>();

        for (const folder of fileList) {
          if (folder.kind === 'folder' && prevCollapsed.has(folder.fullPath)) {
            newCollapsed.add(folder.fullPath);
          }
        }

        if (prevCollapsed.size !== newCollapsed.size) {
          return newCollapsed;
        }

        return prevCollapsed;
      });
    }, [fileList, collapsed]);

    const filteredFileList = useMemo(() => {
      const list = [];

      let lastDepth = Number.MAX_SAFE_INTEGER;

      for (const fileOrFolder of fileList) {
        const depth = fileOrFolder.depth;
        if (lastDepth === depth) {
          lastDepth = Number.MAX_SAFE_INTEGER;
        }

        if (collapsedFolders.has(fileOrFolder.fullPath)) {
          lastDepth = Math.min(lastDepth, depth);
        }

        if (lastDepth < depth) {
          continue;
        }

        list.push(fileOrFolder);
      }

      return list;
    }, [fileList, collapsedFolders]);

    const toggleCollapseState = (fullPath: string) => {
      setCollapsedFolders((prevSet) => {
        const newSet = new Set(prevSet);

        if (newSet.has(fullPath)) {
          newSet.delete(fullPath);
        } else {
          newSet.add(fullPath);
        }

        return newSet;
      });
    };

    return (
      <div className={classNames('overflow-y-auto text-sm', className)}>
        {filteredFileList.length === 0 ? (
          <div className="text-text-secondary flex h-full flex-col items-center justify-center p-4 text-center select-none">
            <div className="mb-4 scale-75 opacity-40">
              <FileTreeIllustration />
            </div>
            <p className="text-sm font-medium opacity-60">No files found</p>
          </div>
        ) : (
          filteredFileList.map((fileOrFolder) => {
            switch (fileOrFolder.kind) {
              case 'file': {
                return (
                  <File
                    key={fileOrFolder.id}
                    selected={selectedFile === fileOrFolder.fullPath}
                    file={fileOrFolder}
                    unsavedChanges={unsavedFiles?.has(fileOrFolder.fullPath)}
                    onClick={() => {
                      onFileSelect?.(fileOrFolder.fullPath);
                    }}
                  />
                );
              }
              case 'folder': {
                return (
                  <Folder
                    key={fileOrFolder.id}
                    folder={fileOrFolder}
                    selected={
                      allowFolderSelection &&
                      selectedFile === fileOrFolder.fullPath
                    }
                    collapsed={collapsedFolders.has(fileOrFolder.fullPath)}
                    onClick={() => {
                      toggleCollapseState(fileOrFolder.fullPath);
                    }}
                  />
                );
              }
              default: {
                return undefined;
              }
            }
          })
        )}
      </div>
    );
  },
);

export default FileTree;

interface FolderProps {
  folder: FolderNode;
  collapsed: boolean;
  selected?: boolean;
  onClick: () => void;
}

function getFolderIcon(
  name: string,
  isOpen: boolean,
): { icon: string; color: string } {
  const n = name.toLowerCase();
  const open = isOpen;

  const map: Record<string, { icon: string; color: string }> = {
    src: {
      icon: open
        ? 'vscode-icons:folder-type-src-opened'
        : 'vscode-icons:folder-type-src',
      color: '',
    },
    source: {
      icon: open
        ? 'vscode-icons:folder-type-src-opened'
        : 'vscode-icons:folder-type-src',
      color: '',
    },
    components: {
      icon: open
        ? 'vscode-icons:folder-type-component-opened'
        : 'vscode-icons:folder-type-component',
      color: '',
    },
    component: {
      icon: open
        ? 'vscode-icons:folder-type-component-opened'
        : 'vscode-icons:folder-type-component',
      color: '',
    },
    pages: {
      icon: open
        ? 'vscode-icons:folder-type-page-opened'
        : 'vscode-icons:folder-type-page',
      color: '',
    },
    page: {
      icon: open
        ? 'vscode-icons:folder-type-page-opened'
        : 'vscode-icons:folder-type-page',
      color: '',
    },
    public: {
      icon: open
        ? 'vscode-icons:folder-type-public-opened'
        : 'vscode-icons:folder-type-public',
      color: '',
    },
    assets: {
      icon: open
        ? 'vscode-icons:folder-type-asset-opened'
        : 'vscode-icons:folder-type-asset',
      color: '',
    },
    asset: {
      icon: open
        ? 'vscode-icons:folder-type-asset-opened'
        : 'vscode-icons:folder-type-asset',
      color: '',
    },
    images: {
      icon: open
        ? 'vscode-icons:folder-type-images-opened'
        : 'vscode-icons:folder-type-images',
      color: '',
    },
    img: {
      icon: open
        ? 'vscode-icons:folder-type-images-opened'
        : 'vscode-icons:folder-type-images',
      color: '',
    },
    icons: {
      icon: open
        ? 'vscode-icons:folder-type-icons-opened'
        : 'vscode-icons:folder-type-icons',
      color: '',
    },
    styles: {
      icon: open
        ? 'vscode-icons:folder-type-css-opened'
        : 'vscode-icons:folder-type-css',
      color: '',
    },
    css: {
      icon: open
        ? 'vscode-icons:folder-type-css-opened'
        : 'vscode-icons:folder-type-css',
      color: '',
    },
    hooks: {
      icon: open
        ? 'vscode-icons:folder-type-hook-opened'
        : 'vscode-icons:folder-type-hook',
      color: '',
    },
    hook: {
      icon: open
        ? 'vscode-icons:folder-type-hook-opened'
        : 'vscode-icons:folder-type-hook',
      color: '',
    },
    utils: {
      icon: open
        ? 'vscode-icons:folder-type-utils-opened'
        : 'vscode-icons:folder-type-utils',
      color: '',
    },
    util: {
      icon: open
        ? 'vscode-icons:folder-type-utils-opened'
        : 'vscode-icons:folder-type-utils',
      color: '',
    },
    helpers: {
      icon: open
        ? 'vscode-icons:folder-type-helper-opened'
        : 'vscode-icons:folder-type-helper',
      color: '',
    },
    lib: {
      icon: open
        ? 'vscode-icons:folder-type-lib-opened'
        : 'vscode-icons:folder-type-lib',
      color: '',
    },
    libs: {
      icon: open
        ? 'vscode-icons:folder-type-lib-opened'
        : 'vscode-icons:folder-type-lib',
      color: '',
    },
    api: {
      icon: open
        ? 'vscode-icons:folder-type-api-opened'
        : 'vscode-icons:folder-type-api',
      color: '',
    },
    routes: {
      icon: open
        ? 'vscode-icons:folder-type-route-opened'
        : 'vscode-icons:folder-type-route',
      color: '',
    },
    route: {
      icon: open
        ? 'vscode-icons:folder-type-route-opened'
        : 'vscode-icons:folder-type-route',
      color: '',
    },
    config: {
      icon: open
        ? 'vscode-icons:folder-type-config-opened'
        : 'vscode-icons:folder-type-config',
      color: '',
    },
    configs: {
      icon: open
        ? 'vscode-icons:folder-type-config-opened'
        : 'vscode-icons:folder-type-config',
      color: '',
    },
    store: {
      icon: open
        ? 'vscode-icons:folder-type-redux-store-opened'
        : 'vscode-icons:folder-type-redux-store',
      color: '',
    },
    stores: {
      icon: open
        ? 'vscode-icons:folder-type-redux-store-opened'
        : 'vscode-icons:folder-type-redux-store',
      color: '',
    },
    context: {
      icon: open
        ? 'vscode-icons:folder-type-context-opened'
        : 'vscode-icons:folder-type-context',
      color: '',
    },
    contexts: {
      icon: open
        ? 'vscode-icons:folder-type-context-opened'
        : 'vscode-icons:folder-type-context',
      color: '',
    },
    types: {
      icon: open
        ? 'vscode-icons:folder-type-typescript-opened'
        : 'vscode-icons:folder-type-typescript',
      color: '',
    },
    test: {
      icon: open
        ? 'vscode-icons:folder-type-test-opened'
        : 'vscode-icons:folder-type-test',
      color: '',
    },
    tests: {
      icon: open
        ? 'vscode-icons:folder-type-test-opened'
        : 'vscode-icons:folder-type-test',
      color: '',
    },
    __tests__: {
      icon: open
        ? 'vscode-icons:folder-type-test-opened'
        : 'vscode-icons:folder-type-test',
      color: '',
    },
    node_modules: {
      icon: open
        ? 'vscode-icons:folder-type-node-opened'
        : 'vscode-icons:folder-type-node',
      color: '',
    },
    '.git': {
      icon: open
        ? 'vscode-icons:folder-type-git-opened'
        : 'vscode-icons:folder-type-git',
      color: '',
    },
    dist: {
      icon: open
        ? 'vscode-icons:folder-type-dist-opened'
        : 'vscode-icons:folder-type-dist',
      color: '',
    },
    build: {
      icon: open
        ? 'vscode-icons:folder-type-dist-opened'
        : 'vscode-icons:folder-type-dist',
      color: '',
    },
    out: {
      icon: open
        ? 'vscode-icons:folder-type-dist-opened'
        : 'vscode-icons:folder-type-dist',
      color: '',
    },
    layouts: {
      icon: open
        ? 'vscode-icons:folder-type-layout-opened'
        : 'vscode-icons:folder-type-layout',
      color: '',
    },
    layout: {
      icon: open
        ? 'vscode-icons:folder-type-layout-opened'
        : 'vscode-icons:folder-type-layout',
      color: '',
    },
    middleware: {
      icon: open
        ? 'vscode-icons:folder-type-middleware-opened'
        : 'vscode-icons:folder-type-middleware',
      color: '',
    },
  };

  return (
    map[n] ?? {
      icon: open
        ? 'vscode-icons:default-folder-opened'
        : 'vscode-icons:default-folder',
      color: '',
    }
  );
}

function getFileIcon(name: string): { icon: string; color: string } {
  const lower = name.toLowerCase();
  const ext = lower.includes('.')
    ? lower.slice(lower.lastIndexOf('.') + 1)
    : '';

    const exactMap: Record<string, { icon: string; color: string }> = {
    'package.json': { icon: 'vscode-icons:file-type-npm', color: '' },
    'package-lock.json': { icon: 'vscode-icons:file-type-npm', color: '' },
    'yarn.lock': { icon: 'vscode-icons:file-type-yarn', color: '' },
    'pnpm-lock.yaml': { icon: 'vscode-icons:file-type-pnpm', color: '' },
    '.gitignore': { icon: 'vscode-icons:file-type-git', color: '' },
    '.gitattributes': { icon: 'vscode-icons:file-type-git', color: '' },
    '.env': { icon: 'vscode-icons:file-type-dotenv', color: '' },
    '.env.local': { icon: 'vscode-icons:file-type-dotenv', color: '' },
    '.env.development': { icon: 'vscode-icons:file-type-dotenv', color: '' },
    '.env.production': { icon: 'vscode-icons:file-type-dotenv', color: '' },
    'readme.md': { icon: 'vscode-icons:file-type-readme', color: '' },
    license: { icon: 'vscode-icons:file-type-license', color: '' },
    dockerfile: { icon: 'vscode-icons:file-type-docker', color: '' },
    'docker-compose.yml': { icon: 'vscode-icons:file-type-docker', color: '' },
    'docker-compose.yaml': { icon: 'vscode-icons:file-type-docker', color: '' },
    'vite.config.js': { icon: 'vscode-icons:file-type-vite', color: '' },
    'vite.config.ts': { icon: 'vscode-icons:file-type-vite', color: '' },
    'vite.config.mjs': { icon: 'vscode-icons:file-type-vite', color: '' },
    'tailwind.config.js': {
      icon: 'vscode-icons:file-type-tailwind',
      color: '',
    },
    'tailwind.config.ts': {
      icon: 'vscode-icons:file-type-tailwind',
      color: '',
    },
    'postcss.config.js': { icon: 'vscode-icons:file-type-postcss', color: '' },
    'postcss.config.ts': { icon: 'vscode-icons:file-type-postcss', color: '' },
    'next.config.js': { icon: 'vscode-icons:file-type-next', color: '' },
    'next.config.ts': { icon: 'vscode-icons:file-type-next', color: '' },
    'next.config.mjs': { icon: 'vscode-icons:file-type-next', color: '' },
    'tsconfig.json': { icon: 'vscode-icons:file-type-tsconfig', color: '' },
    'tsconfig.node.json': {
      icon: 'vscode-icons:file-type-tsconfig',
      color: '',
    },
    '.eslintrc': { icon: 'vscode-icons:file-type-eslint', color: '' },
    '.eslintrc.js': { icon: 'vscode-icons:file-type-eslint', color: '' },
    '.eslintrc.json': { icon: 'vscode-icons:file-type-eslint', color: '' },
    '.eslintrc.cjs': { icon: 'vscode-icons:file-type-eslint', color: '' },
    '.prettierrc': { icon: 'vscode-icons:file-type-prettier', color: '' },
    '.prettierrc.js': { icon: 'vscode-icons:file-type-prettier', color: '' },
    '.prettierrc.json': { icon: 'vscode-icons:file-type-prettier', color: '' },
    'babel.config.js': { icon: 'vscode-icons:file-type-babel', color: '' },
    'babel.config.json': { icon: 'vscode-icons:file-type-babel', color: '' },
    '.babelrc': { icon: 'vscode-icons:file-type-babel', color: '' },
    'jest.config.js': { icon: 'vscode-icons:file-type-jest', color: '' },
    'jest.config.ts': { icon: 'vscode-icons:file-type-jest', color: '' },
    'vitest.config.ts': { icon: 'vscode-icons:file-type-vitest', color: '' },
    'vitest.config.js': { icon: 'vscode-icons:file-type-vitest', color: '' },
    'astro.config.mjs': { icon: 'vscode-icons:file-type-astro', color: '' },
    'svelte.config.js': { icon: 'vscode-icons:file-type-svelte', color: '' },
    'nuxt.config.ts': { icon: 'vscode-icons:file-type-nuxt', color: '' },
    'index.html': { icon: 'vscode-icons:file-type-html', color: '' },
    'app.jsx': { icon: 'vscode-icons:file-type-reactjs', color: '' },
    'app.tsx': { icon: 'vscode-icons:file-type-reactts', color: '' },
    'main.jsx': { icon: 'vscode-icons:file-type-reactjs', color: '' },
    'main.tsx': { icon: 'vscode-icons:file-type-reactts', color: '' },
    'index.jsx': { icon: 'vscode-icons:file-type-reactjs', color: '' },
    'index.tsx': { icon: 'vscode-icons:file-type-reactts', color: '' },
    'global.css': { icon: 'vscode-icons:file-type-css', color: '' },
    'globals.css': { icon: 'vscode-icons:file-type-css', color: '' },
    'index.css': { icon: 'vscode-icons:file-type-css', color: '' },
  };

  if (exactMap[lower]) return exactMap[lower];

  const extMap: Record<string, { icon: string; color: string }> = {
    js: { icon: 'vscode-icons:file-type-js', color: '' },
    mjs: { icon: 'vscode-icons:file-type-js', color: '' },
    cjs: { icon: 'vscode-icons:file-type-js', color: '' },
    jsx: { icon: 'vscode-icons:file-type-reactjs', color: '' },
    // TypeScript
    ts: { icon: 'vscode-icons:file-type-typescript', color: '' },
    mts: { icon: 'vscode-icons:file-type-typescript', color: '' },
    tsx: { icon: 'vscode-icons:file-type-reactts', color: '' },
    // Web
    html: { icon: 'vscode-icons:file-type-html', color: '' },
    htm: { icon: 'vscode-icons:file-type-html', color: '' },
    css: { icon: 'vscode-icons:file-type-css', color: '' },
    scss: { icon: 'vscode-icons:file-type-scss', color: '' },
    sass: { icon: 'vscode-icons:file-type-sass', color: '' },
    less: { icon: 'vscode-icons:file-type-less', color: '' },
    // Data
    json: { icon: 'vscode-icons:file-type-json', color: '' },
    jsonc: { icon: 'vscode-icons:file-type-json', color: '' },
    yaml: { icon: 'vscode-icons:file-type-yaml', color: '' },
    yml: { icon: 'vscode-icons:file-type-yaml', color: '' },
    toml: { icon: 'vscode-icons:file-type-toml', color: '' },
    xml: { icon: 'vscode-icons:file-type-xml', color: '' },
    csv: { icon: 'vscode-icons:file-type-csv', color: '' },
    // Docs
    md: { icon: 'vscode-icons:file-type-markdown', color: '' },
    mdx: { icon: 'vscode-icons:file-type-mdx', color: '' },
    txt: { icon: 'vscode-icons:file-type-text', color: '' },
    pdf: { icon: 'vscode-icons:file-type-pdf', color: '' },
    // Images
    svg: { icon: 'vscode-icons:file-type-svg', color: '' },
    png: { icon: 'vscode-icons:file-type-image', color: '' },
    jpg: { icon: 'vscode-icons:file-type-image', color: '' },
    jpeg: { icon: 'vscode-icons:file-type-image', color: '' },
    gif: { icon: 'vscode-icons:file-type-image', color: '' },
    webp: { icon: 'vscode-icons:file-type-image', color: '' },
    ico: { icon: 'vscode-icons:file-type-favicon', color: '' },
    // Styles
    woff: { icon: 'vscode-icons:file-type-font', color: '' },
    woff2: { icon: 'vscode-icons:file-type-font', color: '' },
    ttf: { icon: 'vscode-icons:file-type-font', color: '' },
    otf: { icon: 'vscode-icons:file-type-font', color: '' },
    // Config
    sh: { icon: 'vscode-icons:file-type-shell', color: '' },
    bash: { icon: 'vscode-icons:file-type-shell', color: '' },
    zsh: { icon: 'vscode-icons:file-type-shell', color: '' },
    lock: { icon: 'vscode-icons:file-type-yarn', color: '' },
    // Frameworks
    vue: { icon: 'vscode-icons:file-type-vue', color: '' },
    svelte: { icon: 'vscode-icons:file-type-svelte', color: '' },
    astro: { icon: 'vscode-icons:file-type-astro', color: '' },
    // Python
    py: { icon: 'vscode-icons:file-type-python', color: '' },
    // Ruby
    rb: { icon: 'vscode-icons:file-type-ruby', color: '' },
    // Go
    go: { icon: 'vscode-icons:file-type-go', color: '' },
    // Rust
    rs: { icon: 'vscode-icons:file-type-rust', color: '' },
    // GraphQL
    gql: { icon: 'vscode-icons:file-type-graphql', color: '' },
    graphql: { icon: 'vscode-icons:file-type-graphql', color: '' },
    // Prisma
    prisma: { icon: 'vscode-icons:file-type-prisma', color: '' },
  };

  return extMap[ext] ?? { icon: 'vscode-icons:default-file', color: '' };
}

function Folder({
  folder: { depth, name },
  collapsed,
  selected = false,
  onClick,
}: FolderProps) {
  const isOpen = !collapsed;
  const { icon: folderIcon } = getFolderIcon(name, isOpen);

  return (
    <NodeButton
      className={classNames('group', {
        'text-text-secondary hover:text-text hover:bg-surface-c border-transparent bg-transparent':
          !selected,
        '!border-l-[var(--d-admin-primary-color)] bg-[var(--d-admin-surface-d)] font-medium text-[var(--d-admin-primary-color)]':
          selected,
      })}
      depth={depth}
      iconClasses="scale-98"
      onClick={onClick}
    >
      <span className="flex items-center shrink-0">
        <Icon
          icon={collapsed ? 'ph:caret-right' : 'ph:caret-down'}
          className={classNames('mr-0.5 text-[10px]', {
            'text-text-secondary': !selected,
            'text-primary': selected,
          })}
        />
        {/* Material folder icon */}
        <Icon icon={folderIcon} className="text-base" />
      </span>
      {name}
    </NodeButton>
  );
}

interface FileProps {
  file: FileNode;
  selected: boolean;
  unsavedChanges?: boolean;
  onClick: () => void;
}

function File({
  file: { depth, name },
  onClick,
  selected,
  unsavedChanges = false,
}: FileProps) {
  const { icon: fileIcon } = getFileIcon(name);

  return (
    <NodeButton
      className={classNames('group', {
        'hover:bg-surface-c text-text-secondary border-transparent bg-transparent':
          !selected,
        '!border-l-[var(--d-admin-primary-color)] bg-[var(--d-admin-surface-d)] font-medium text-[var(--d-admin-primary-color)]':
          selected,
      })}
      depth={depth}
      iconClasses={classNames('scale-98', {
        'group-hover:text-text': !selected,
      })}
      onClick={onClick}
    >
      <Icon icon={fileIcon} className="shrink-0 text-base" />
      <div
        className={classNames('flex items-center', {
          'group-hover:text-text': !selected,
        })}
      >
        <div className="flex-1 truncate pr-2">{name}</div>
        {unsavedChanges && (
          <span className="h-2 w-2 shrink-0 scale-68 rounded-full bg-orange-500 text-orange-500" />
        )}
      </div>
    </NodeButton>
  );
}

interface ButtonProps {
  depth: number;
  iconClasses: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function NodeButton({
  depth,
  iconClasses,
  onClick,
  className,
  children,
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'text-faded flex w-full items-center gap-1.5 border-2 border-transparent py-0.5 pr-2',
        className,
      )}
      style={{ paddingLeft: `${6 + depth * NODE_PADDING_LEFT}px` }}
      onClick={() => onClick?.()}
    >
      <div
        className={classNames(
          'flex shrink-0 scale-120 items-center justify-center',
          iconClasses,
        )}
      ></div>
      <div className="flex w-full items-center gap-2 truncate text-left">
        {children}
      </div>
    </button>
  );
}

type Node = FileNode | FolderNode;

interface BaseNode {
  id: number;
  depth: number;
  name: string;
  fullPath: string;
}

interface FileNode extends BaseNode {
  kind: 'file';
}

interface FolderNode extends BaseNode {
  kind: 'folder';
}

function buildFileList(
  files: FileMap,
  rootFolder = '/',
  hideRoot: boolean,
  hiddenFiles: Array<string | RegExp>,
): Node[] {
  const folderPaths = new Set<string>();
  const fileList: Node[] = [];

  let defaultDepth = 0;

  if (rootFolder === '/' && !hideRoot) {
    defaultDepth = 1;
    fileList.push({
      kind: 'folder',
      name: '/',
      depth: 0,
      id: 0,
      fullPath: '/',
    });
  }

  for (const [filePath, dirent] of Object.entries(files)) {
    const segments = filePath.split('/').filter((segment) => segment);
    const fileName = segments.at(-1);

    if (!fileName || isHiddenFile(filePath, fileName, hiddenFiles)) {
      continue;
    }

    let currentPath = '';

    let i = 0;
    let depth = 0;

    while (i < segments.length) {
      const name = segments[i];
      const fullPath = (currentPath += `/${name}`);

      if (
        !fullPath.startsWith(rootFolder) ||
        (hideRoot && fullPath === rootFolder)
      ) {
        i++;
        continue;
      }

      if (i === segments.length - 1 && dirent?.type === 'file') {
        fileList.push({
          kind: 'file',
          id: fileList.length,
          name,
          fullPath,
          depth: depth + defaultDepth,
        });
      } else if (!folderPaths.has(fullPath)) {
        folderPaths.add(fullPath);

        fileList.push({
          kind: 'folder',
          id: fileList.length,
          name,
          fullPath,
          depth: depth + defaultDepth,
        });
      }

      i++;
      depth++;
    }
  }

  return sortFileList(rootFolder, fileList, hideRoot);
}

function isHiddenFile(
  filePath: string,
  fileName: string,
  hiddenFiles: Array<string | RegExp>,
) {
  return hiddenFiles.some((pathOrRegex) => {
    if (typeof pathOrRegex === 'string') {
      return fileName === pathOrRegex;
    }

    return pathOrRegex.test(filePath);
  });
}

function sortFileList(
  rootFolder: string,
  nodeList: Node[],
  hideRoot: boolean,
): Node[] {
  logger.trace('sortFileList');

  const nodeMap = new Map<string, Node>();
  const childrenMap = new Map<string, Node[]>();
  nodeList.sort((a, b) => compareNodes(a, b));

  for (const node of nodeList) {
    nodeMap.set(node.fullPath, node);

    const parentPath = node.fullPath.slice(0, node.fullPath.lastIndexOf('/'));

    if (parentPath !== rootFolder.slice(0, rootFolder.lastIndexOf('/'))) {
      if (!childrenMap.has(parentPath)) {
        childrenMap.set(parentPath, []);
      }

      childrenMap.get(parentPath)?.push(node);
    }
  }

  const sortedList: Node[] = [];

  const depthFirstTraversal = (path: string): void => {
    const node = nodeMap.get(path);

    if (node) {
      sortedList.push(node);
    }

    const children = childrenMap.get(path);

    if (children) {
      for (const child of children) {
        if (child.kind === 'folder') {
          depthFirstTraversal(child.fullPath);
        } else {
          sortedList.push(child);
        }
      }
    }
  };

  if (hideRoot) {
    const rootChildren = childrenMap.get(rootFolder) || [];

    for (const child of rootChildren) {
      depthFirstTraversal(child.fullPath);
    }
  } else {
    depthFirstTraversal(rootFolder);
  }

  return sortedList;
}

function compareNodes(a: Node, b: Node): number {
  if (a.kind !== b.kind) {
    return a.kind === 'folder' ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
