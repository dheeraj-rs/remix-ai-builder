import { WebContainer } from '@webcontainer/api';
import * as nodePath from 'path-browserify';
import { createScopedLogger } from '../../utils/logger';
import { unreachable } from '../../utils/unreachable';
import { useFilesStore } from '../../stores/zustand';
import type { ActionState } from './action-types';

const logger = createScopedLogger('ActionFile');

export async function runFileAction(
  action: ActionState,
  webcontainerPromise: Promise<WebContainer>
) {
  if (action.type !== 'file') {
    unreachable('Expected file action');
  }

  console.time(`[ActionFile] Write file: ${action.filePath}`);
  const webcontainer = await webcontainerPromise;

  let folder = nodePath.dirname(action.filePath);

  folder = folder.replace(/\/+$/g, '');

  if (folder !== '.') {
    try {
      await webcontainer.fs.mkdir(folder, { recursive: true });
      logger.debug('Created folder', folder);
      const absoluteFolder = folder.startsWith('/')
        ? folder
        : `/home/project/${folder}`;
      useFilesStore.getState().setFile(absoluteFolder, { type: 'folder' });
    } catch (error) {
      logger.error('Failed to create folder\n\n', error);
    }
  }

  try {
    let fileContent = action.content;
    if (
      action.filePath.match(/src\/(App|app|main|index)\.(jsx|tsx)$/i) &&
      action.content.includes('react-router') &&
      !action.content.includes('ROUTE_CHANGE')
    ) {
      logger.info('Injecting route tracker into', action.filePath);
      const routeTrackerCode = `
// Auto-injected runtime tools for URL sync and element selection
import { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';

// Robust URL Sync (History Patch) - Runs once per module load
if (typeof window !== 'undefined' && !window._routeTrackerInstalled) {
  window._routeTrackerInstalled = true;
  const notify = () => {
    try {
        window.parent.postMessage({
            type: 'ROUTE_CHANGE',
            path: location.pathname + location.search + location.hash
        }, '*');
    } catch (e) {}
  };
  
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  
  history.pushState = function(...args) {
    originalPush.apply(this, args);
    setTimeout(notify, 10);
  };
  
  history.replaceState = function(...args) {
    originalReplace.apply(this, args);
    setTimeout(notify, 10);
  };
  
  window.addEventListener('popstate', notify);
  // Initial sync
  setTimeout(notify, 100);
}

function RuntimeTools() {
  const navigate = ReactRouterDOM.useNavigate ? ReactRouterDOM.useNavigate() : null;
  const location = ReactRouterDOM.useLocation ? ReactRouterDOM.useLocation() : null;
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [hoveredElement, setHoveredElement] = useState(null);

  // Handle incoming messages (Navigation) - requires navigate or fallback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'NAVIGATE') {
        if (navigate) {
          navigate(event.data.path);
        } else {
          window.location.href = event.data.path;
        }
      }
      
      if (event.data?.type === 'TOGGLE_SELECTION') {
        setIsSelectionMode(event.data.enabled);
        if (!event.data.enabled) {
          setHoveredElement(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  // Selection Visuals & Interaction
  useEffect(() => {
    if (!isSelectionMode) {
      document.body.style.cursor = 'default';
      return;
    }

    document.body.style.cursor = 'crosshair';

    const handleMouseOver = (e) => {
      e.stopPropagation();
      const target = e.target;
      if (target === document.body || target === document.documentElement) return;
      
      setHoveredElement(target);
      target.style.outline = '2px solid #3b82f6';
      target.style.outlineOffset = '-2px';
      target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.3)';
    };

    const handleMouseOut = (e) => {
      e.stopPropagation();
      const target = e.target;
      target.style.outline = '';
      target.style.outlineOffset = '';
      target.style.boxShadow = '';
    };

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target;
      target.style.outline = '';
      target.style.outlineOffset = '';
      target.style.boxShadow = '';
      
      const elementInfo = {
        tagName: target.tagName.toLowerCase(),
        id: target.id,
        class: target.className,
        text: target.innerText?.substring(0, 100) || '',
      };

      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        element: elementInfo
      }, '*');

      setIsSelectionMode(false);
      setHoveredElement(null);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
      if (hoveredElement) {
        hoveredElement.style.outline = '';
        hoveredElement.style.outlineOffset = '';
        hoveredElement.style.boxShadow = '';
      }
    };
  }, [isSelectionMode, hoveredElement]);

  return null;
}
`;
      if (
        fileContent.includes('<BrowserRouter>') ||
        fileContent.includes('<Router>')
      ) {
        const appComponentMatch = fileContent.match(
          /(?:function|const|class)\s+App|export\s+(?:default\s+)?(?:function|class)\s+App/,
        );

        if (appComponentMatch && appComponentMatch.index !== undefined) {
          const insertPosition = appComponentMatch.index;
          fileContent =
            fileContent.slice(0, insertPosition) +
            routeTrackerCode +
            '\n' +
            fileContent.slice(insertPosition);
          logger.info(
            '[ActionFile] ✅ Injected RouteTracker component definition',
          );
        } else {
          const lastImportMatch = fileContent.match(
            /import\s+.*;\n(?![^]*import)/,
          );
          if (lastImportMatch && lastImportMatch.index !== undefined) {
            const insertPosition =
              lastImportMatch.index + lastImportMatch[0].length;
            fileContent =
              fileContent.slice(0, insertPosition) +
              '\n' +
              routeTrackerCode +
              '\n' +
              fileContent.slice(insertPosition);
            logger.info(
              '[ActionFile] ✅ Injected RouteTracker after imports (fallback)',
            );
          }
        }

        if (fileContent.includes('<BrowserRouter>')) {
          fileContent = fileContent.replace(
            /(<BrowserRouter[^>]*>)/,
            '$1\n      <RouteTracker />',
          );
        } else if (fileContent.includes('<Router>')) {
          fileContent = fileContent.replace(
            /(<Router[^>]*>)/,
            '$1\n      <RouteTracker />',
          );
        }
      }
    }

    if (action.filePath.endsWith('.html')) {
      const script = `
<script>
(function() {
  if (window._routeTrackerInstalled) return;
  window._routeTrackerInstalled = true;

  const notify = () => {
    try {
        window.parent.postMessage({
            type: 'ROUTE_CHANGE',
            path: location.pathname + location.search + location.hash
        }, '*');
    } catch (e) {}
  };
  
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  
  history.pushState = function(...args) {
    originalPush.apply(this, args);
    setTimeout(notify, 10);
  };
  
  history.replaceState = function(...args) {
    originalReplace.apply(this, args);
    setTimeout(notify, 10);
  };
  
  window.addEventListener('popstate', notify);
  setTimeout(notify, 100);

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE') {
        const path = event.data.path;
        if (path && path !== location.pathname + location.search + location.hash) {
            window.location.href = path;
        }
    }
  });
})();
</script>
`;
      if (fileContent.includes('</body>')) {
        fileContent = fileContent.replace('</body>', `${script}</body>`);
      } else if (fileContent.includes('</head>')) {
        fileContent = fileContent.replace('</head>', `${script}</head>`);
      } else {
        fileContent += script;
      }
      logger.info('[ActionFile] Injected navigation script into HTML file');
    }

    await webcontainer.fs.writeFile(action.filePath, fileContent);
    console.timeEnd(`[ActionFile] Write file: ${action.filePath}`);
    logger.debug(`File written ${action.filePath}`);

    const absoluteFilePath = action.filePath.startsWith('/')
      ? action.filePath
      : `/home/project/${action.filePath}`;

    const fileStore = useFilesStore.getState();
    const isNewFile = !fileStore.getFile(absoluteFilePath);

    fileStore.setFile(absoluteFilePath, {
      type: 'file',
      content: fileContent,
      isBinary: false,
    });

    if (isNewFile) {
      fileStore.incrementFilesCount();
    }
  } catch (error) {
    console.timeEnd(`[ActionFile] Write file: ${action.filePath}`);
    logger.error('Failed to write file\n\n', error);
  }
}
