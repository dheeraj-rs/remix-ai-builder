import { WebContainer } from '@webcontainer/api';
import { unreachable } from '../../utils/unreachable';
import { createScopedLogger } from '../../utils/logger';
import {
  useAiBuilderStore,
} from '../../stores/ai-builder-store';
import {
  useWorkbenchStore,
  useTerminalStore,
  usePreviewStore,
} from '../../stores/zustand';
import type { ActionState, ActionStateUpdate } from './action-types';
import { stripAnsi, isDevServerCommand, extractDevServerUrl } from './action-utils';

const logger = createScopedLogger('ActionShell');

export interface RunShellActionOptions {
  action: ActionState;
  actionId: string;
  webcontainerPromise: Promise<WebContainer>;
  updateAction: (id: string, newState: ActionStateUpdate) => void;
  projectContext: { switched: boolean };
}

export async function runShellAction({
  action,
  actionId,
  webcontainerPromise,
  updateAction,
  projectContext,
}: RunShellActionOptions): Promise<void> {
  if (action.type !== 'shell') {
    unreachable('Expected shell action');
  }

  logger.info('Shell command:', action.content);
  useAiBuilderStore.getState().setActiveMobilePanel('workbench');
  useWorkbenchStore.getState().setShowWorkbench(true);

  const { toggleTerminal } = useTerminalStore.getState();
  toggleTerminal(true);

  let terminalState = useTerminalStore.getState().terminals[0];
  let retries = 0;
  while (!terminalState && retries < 50) {
    await new Promise((r) => setTimeout(r, 100));
    terminalState = useTerminalStore.getState().terminals[0];
    retries++;
  }

  if (!terminalState) {
    throw new Error('Terminal not available for command execution');
  }

  if (!projectContext.switched) {
    projectContext.switched = true;
    const { RemoteWebContainer } = await import('../remote-execution-adapter');
    const instance = RemoteWebContainer.activeInstance;
    if (instance) {
      const projectId = (instance as any).projectId as string;
      useTerminalStore.getState().switchProject(projectId);
      await new Promise((r) => setTimeout(r, 600));
      terminalState = useTerminalStore.getState().terminals[0]!;
    }
  }

  // ============================================================================
  // 1. Dependency Check
  // ============================================================================
  // Inject --host for dev server commands on remote backends so Vite binds to
  // 0.0.0.0 and the engine's /proxy/:port/ route can reach it.
  let commandToType = action.content;
  {
    const backendApiUrl = process.env.NEXT_PUBLIC_CODE_RUNNER_API_URL;
    const isRemoteBackend = backendApiUrl
      ? (() => { try { const h = new URL(backendApiUrl).hostname; return h !== 'localhost' && h !== '127.0.0.1'; } catch { return false; } })()
      : false;
    if (isRemoteBackend && isDevServerCommand(commandToType) && !commandToType.includes('--host')) {
      // Append "-- --host" to bind Vite to 0.0.0.0 inside the container
      commandToType = commandToType.includes(' -- ') ? commandToType + ' --host' : commandToType + ' -- --host';
    }
  }
  const webcontainer = await webcontainerPromise;
  const isDevServer = isDevServerCommand(action.content);

  let hasPackageJson = false;
  let hasBuildScript = false;

  try {
    const pkgBytes = await webcontainer.fs.readFile('package.json', 'utf-8');
    hasPackageJson = true;
    const pkgInfo = JSON.parse(pkgBytes);
    if (pkgInfo?.scripts?.build) {
      hasBuildScript = true;
    }
  } catch { }

  if (
    hasPackageJson &&
    action.content.match(
      /(npm run|yarn run|pnpm run|node|vite|next|astro|react-scripts|ts-node)/,
    )
  ) {
    try {
      await webcontainer.fs.readdir('node_modules');
    } catch {
      logger.info(
        '[ActionShell] node_modules missing. Prepending install...',
      );
      updateAction(actionId, {
        statusMessage: 'Installing dependencies...',
      });

      commandToType = `pnpm install --reporter=silent --prefer-offline && ${action.content}`;
    }
  }

  // ============================================================================
  // 2. Deep Validation Interceptor
  // ============================================================================
  if (
    isDevServer &&
    hasBuildScript &&
    !action.content.includes('npm run build') &&
    !action.content.includes('tsc ')
  ) {
    logger.info(
      '[ActionShell] Auto-injecting build validation step before dev server...',
    );

    if (commandToType.includes('pnpm install')) {
      commandToType = commandToType.replace('&& ', '&& npm run build && ');
    } else {
      commandToType = `npm run build && ${commandToType}`;
    }
  }

  const doneMarker = `__ACTION_DONE_${actionId}__`;
  let outputBuffer = '';
  let rawOutput = '';
  let errorAnalysisBuffer = '';

  let missingDependencyDetected = false;
  let syntaxErrorDetected = false;
  let buildErrorDetected = false;
  let portConflictDetected = false;
  let devServerStarted = false;

  let lastUpdate = Date.now();
  const updateInterval = 200;

  const originalWrite = terminalState.terminal.write;

  const executionPromise = new Promise<number>((resolve, reject) => {
    const cleanup = () => {
      if (terminalState.terminal.write === interceptor) {
        terminalState.terminal.write = originalWrite;
      }
    };

    const interceptor = (data: any) => {
      let str =
        typeof data === 'string' ? data : new TextDecoder().decode(data);

      const markerRegexFilter = new RegExp(`__ACTION_DONE_[a-zA-Z0-9-]+__\\d*`);
      if (markerRegexFilter.test(str)) {
        outputBuffer += str;
        rawOutput += str;
        const now = Date.now();
        if (now - lastUpdate > updateInterval) {
          updateAction(actionId, { output: stripAnsi(outputBuffer) });
          lastUpdate = now;
        }
        const cleanOutput = stripAnsi(rawOutput);
        const markerRegex = new RegExp(`${doneMarker}(\\d+)`);
        const markerMatch = cleanOutput.match(markerRegex);
        if (markerMatch) {
          const code = parseInt(markerMatch[1], 10);
          cleanup();
          resolve(code);
        }
        return;
      }

      str = str.replace(/(?:\r?\n){5,}/g, '\r\n\r\n');
      const xtermStr = str
        .replace(/;?\s*echo\s+"__ACTION_DONE_[a-zA-Z0-9-]+__\$\?"\r?\n?/g, '')
        .replace(/__ACTION_DONE_[a-zA-Z0-9-]+__\d+\r?\n?/g, '')
        .replace(/(npm run build(?: && npm run dev)?);\s*echo\s+"__ACTION_DONE_[a-zA-Z0-9-]+__\$\?"\r?\n?/g, '$1');

      originalWrite.call(terminalState.terminal, xtermStr);

      outputBuffer += str;
      rawOutput += str;

      const now = Date.now();
      if (now - lastUpdate > updateInterval) {
        updateAction(actionId, { output: stripAnsi(outputBuffer) });
        lastUpdate = now;
      }

      // ============================================================================
      // 3. Dynamic Error Detection (Sliding Window Buffer)
      // ============================================================================
      const cleanStr = stripAnsi(str);
      errorAnalysisBuffer += cleanStr;

      const lowerBuf = errorAnalysisBuffer.toLowerCase();

      if (
        lowerBuf.includes('command not found') ||
        lowerBuf.includes('not found:') ||
        lowerBuf.includes('cannot find module')
      ) {
        missingDependencyDetected = true;
        errorAnalysisBuffer = '';
      }

      const BUILD_ERROR_PATTERNS = [
        /SyntaxError|Unexpected token|Parse error/i,
        /Unable to parse|parse error|parsing error|parse5/i,
        /Failed to compile|Build failed|compilation error/i,
        /Failed to resolve import|Could not resolve/i,
        /\[plugin:[a-zA-Z0-9_-]+\]/i,
        /Error:\s[A-Z]/i,
      ];

      let foundErrorMatch = false;

      if (BUILD_ERROR_PATTERNS.some((pattern) => errorAnalysisBuffer.match(pattern))) {
        const isParseError = errorAnalysisBuffer.match(/Unable to parse|parse error|parsing error|parse5/i);

        if (
          isParseError ||
          errorAnalysisBuffer.includes('ERR_') ||
          lowerBuf.includes('error:')
        ) {
          useWorkbenchStore.getState().setBuildError(true);
          foundErrorMatch = true;
        }

        if (errorAnalysisBuffer.match(/SyntaxError|Unexpected token|Parse error|Unable to parse/i)) {
          syntaxErrorDetected = true;
          foundErrorMatch = true;
        }

        if (errorAnalysisBuffer.match(/Failed to compile|Build failed/i)) {
          buildErrorDetected = true;
          foundErrorMatch = true;
        }
      }

      if (foundErrorMatch) {
        errorAnalysisBuffer = '';
      } else if (errorAnalysisBuffer.match(/EADDRINUSE|port.*already in use/i)) {
        portConflictDetected = true;
        errorAnalysisBuffer = '';
      } else if (errorAnalysisBuffer.length > 2000) {
        errorAnalysisBuffer = errorAnalysisBuffer.slice(-1000);
      }

      const cleanOutput = stripAnsi(rawOutput);

      if (isDevServer && !devServerStarted) {
        const serverUrl = extractDevServerUrl(cleanOutput);
        if (serverUrl) {
          devServerStarted = true;
          updateAction(actionId, { output: stripAnsi(outputBuffer) });

          useWorkbenchStore.getState().setBuildError(false);
          buildErrorDetected = false;
          syntaxErrorDetected = false;

          const portMatch = serverUrl.match(/(\d{3,5})/);
          const port = portMatch ? parseInt(portMatch[1], 10) : 5173;

          const backendApiUrl = process.env.NEXT_PUBLIC_CODE_RUNNER_API_URL;
          let fullUrl: string;
          if (backendApiUrl) {
            try {
              const parsed = new URL(backendApiUrl);
              const isLocal =
                parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1';
              if (isLocal) {
                fullUrl = `http://${parsed.hostname}:${port}/`;
              } else {
                // Remote backend: Vite is not publicly exposed. Route through the proxy.
                const portSuffix = parsed.port ? `:${parsed.port}` : '';
                fullUrl = `${parsed.protocol}//${parsed.hostname}${portSuffix}/proxy/${port}/`;
              }
            } catch (e) {
              fullUrl = `http://localhost:${port}/`;
            }
          } else {
            const hostname =
              typeof window !== 'undefined'
                ? window.location.hostname
                : 'localhost';
            fullUrl = `http://${hostname}:${port}/`;
          }

          usePreviewStore.getState().setPreviews([
            {
              baseUrl: fullUrl,
              port,
              ready: true,
            },
          ]);
          usePreviewStore.getState().setActivePreviewIndex(0);
          usePreviewStore.getState().setUrl(fullUrl);
          usePreviewStore.getState().setIframeUrl(fullUrl);

          useAiBuilderStore.getState().setActiveMobilePanel('workbench');
          useWorkbenchStore.getState().setCurrentView('preview');
          cleanup();
          resolve(0);
        }
      }

      const markerRegex = new RegExp(`${doneMarker}(\\d+)`);
      const markerMatch = cleanOutput.match(markerRegex);
      if (markerMatch) {
        const code = parseInt(markerMatch[1], 10);
        cleanup();
        resolve(code);
      }
    };

    terminalState.terminal.write = interceptor;

    action.abortSignal.addEventListener('abort', () => {
      const writeInput = (terminalState.process as any).writeInput;
      if (writeInput) {
        writeInput('\x03');
      }
      cleanup();
      reject(new Error('Aborted'));
    });
  });

  try {
    const writeInput = (terminalState.process as any).writeInput;

    writeInput('\x03');
    await new Promise((r) => setTimeout(r, 200));
    writeInput('\x03');
    await new Promise((r) => setTimeout(r, 500));

    outputBuffer = '';
    rawOutput = '';

    const promptColor = '\x1b[1;36m';
    const resetColor = '\x1b[0m';
    terminalState.terminal.write(`\r\n${promptColor}~/projects${resetColor} > ${action.content}\r\n`);

    const fullCommand = `${commandToType}; echo "__ACTION_DONE_${actionId}__$?"`;
    writeInput(`${fullCommand}\r`);
  } catch (err) {
    throw err;
  }

  try {
    const exitCode = await executionPromise;
    updateAction(actionId, { output: stripAnsi(outputBuffer) });

    if (exitCode !== 0 && (!isDevServer || !devServerStarted)) {
      if (
        missingDependencyDetected &&
        !commandToType.includes('pnpm install')
      ) {
        logger.info(
          '[ActionShell] Auto-repairing missing dependencies in terminal...',
        );
        updateAction(actionId, { statusMessage: 'Auto-repairing...' });
        return runShellAction({
          action: {
            ...action,
            content: `pnpm install --reporter=silent --prefer-offline && ${action.content}`,
          },
          actionId,
          webcontainerPromise,
          updateAction,
          projectContext,
        });
      }
      throw new Error(`Process exited with code ${exitCode}`);
    }
  } catch (error) {
    updateAction(actionId, { output: stripAnsi(outputBuffer) });
    throw error;
  }
}
