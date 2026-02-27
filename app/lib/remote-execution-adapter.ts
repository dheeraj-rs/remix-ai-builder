import type {
  WebContainer,
  FileSystemTree,
  WebContainerProcess,
  SpawnOptions,
} from '@webcontainer/api';
import { useFilesStore } from '../stores/zustand';

// Use dynamic hostname to support accessing via network IP (e.g. 192.168.x.x)
const getHostname = () =>
  typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BACKEND_URL = process.env.NEXT_PUBLIC_CODE_RUNNER_API_URL || `http://${getHostname()}:3001`;
const WS_URL = process.env.NEXT_PUBLIC_CODE_RUNNER_WS_URL || `ws://${getHostname()}:3001`;

export class RemoteWebContainer implements Partial<WebContainer> {
  workdir = '/home/project';
  private projectId: string;
  private userId: string = '';
  private watcherCallback: ((events: any[]) => void) | null = null;
  private queuedEvents: any[] = [];
  private activeWebSockets: Set<WebSocket> = new Set();

  /**
   * Disconnects all active terminal websockets to kill backend processes (like Vite).
   * Needed when switching projects or starting a new chat.
   */
  teardown() {
    for (const ws of this.activeWebSockets) {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    }
    this.activeWebSockets.clear();
  }

  // Static reference so ActionRunner can update the active project
  static activeInstance: RemoteWebContainer | null = null;

  constructor(projectId: string = 'workspace') {
    this.projectId = projectId;
    RemoteWebContainer.activeInstance = this;
  }

  /** Call this when the AI generates a new project to reconnect the terminal */
  setProjectId(newProjectId: string) {
    if (this.projectId !== newProjectId) {
      this.projectId = newProjectId;
    }
  }

  /** Call this from the React UI to inject the logged in user or guest session ID */
  setUserId(newUserId: string) {
    if (this.userId !== newUserId) {
      this.userId = newUserId;
    }
  }

  private get sandboxId(): string {
    if (!this.userId) return this.projectId;
    // Sanitize user ID to be folder safe
    const safeUserId = this.userId.replace(/[^a-zA-Z0-9]/g, '_');
    return `${this.projectId}_${safeUserId}`;
  }

  static async boot(): Promise<WebContainer> {
    const instance = new RemoteWebContainer();
    // Do NOT call mount() here. Allow constructor to finish so userId can be set cleanly from UI.
    // The actual project files will be mounted when the AI Builder loads or generates a project.
    return instance as unknown as WebContainer;
  }

  async mount(tree: FileSystemTree): Promise<void> {
    const files = this.flattenTree(tree);

    // Ensure the frontend file store is cleared since the backend will be emptied by isMount: true
    useFilesStore.getState().reset();

    try {
      await window.fetch(`${BACKEND_URL}/project/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.sandboxId,
          files,
          isMount: true,
        }),
      });

      // Buffer initial add_file events
      const events = Object.entries(files).map(([path, content]) => ({
        type: 'add_file',
        path: path.startsWith('/') ? path : `/home/project/${path}`,
        buffer: new TextEncoder().encode(content),
      }));

      this.queuedEvents.push(...events);

      if (this.watcherCallback) {
        this.flushEvents();
      }
    } catch (e) {
      console.warn('[RemoteWebContainer] Failed to mount (engine disconnected)');
    }
  }

  private flushEvents() {
    if (this.watcherCallback && this.queuedEvents.length > 0) {
      this.watcherCallback(this.queuedEvents);
      this.queuedEvents = [];
    }
  }

  private portListener:
    | ((port: number, type: 'open' | 'close', url: string) => void)
    | null = null;
  private queuedPort: { port: number; url: string } | null = null;

  async spawn(
    command: string,
    args: string[] | SpawnOptions = [],
    options?: SpawnOptions,
  ): Promise<WebContainerProcess> {
    // Handle overload
    if (!Array.isArray(args)) {
      options = args as SpawnOptions;
      args = [];
    }

    // Unwrap jsh -c
    if (command === 'jsh' && args[0] === '-c' && args[1]) {
      const innerCommand = args[1];

      // Split command and args
      const parts = innerCommand.split(' ');
      command = parts[0];
      args = parts.slice(1);
    } else if (command === '/bin/jsh') {
      command = 'jsh'; // Send exactly jsh so backend knows it's an interactive login shell
    }

    const ws = new WebSocket(WS_URL);
    this.activeWebSockets.add(ws);
    const self = this;
    let lineBuffer = '';

    const outputStream = new ReadableStream({
      start(controller) {
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            const data = msg.data;
            controller.enqueue(data);

            // Buffer data to handle split chunks
            lineBuffer += data;

            // Check buffer immediately for server ready (even without newline)
            // This fixes the issue where the URL line is the last line and has no newline yet
            const bufferClean = lineBuffer.replace(
              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              '',
            );
            const bufferMatch = bufferClean.match(
              /(?:http:\/\/(?:localhost|127\.0\.0\.1):(\d+))/i,
            );

            if (bufferMatch) {
              // Use window.location.hostname instead of hardcoded localhost to support network access
              const port = parseInt(bufferMatch[1], 10);
              let hostname =
                typeof window !== 'undefined'
                  ? window.location.hostname
                  : 'localhost';

              const backendApiUrl = process.env.NEXT_PUBLIC_CODE_RUNNER_API_URL;
              let isSecure = false;
              if (backendApiUrl) {
                try {
                  const parsed = new URL(backendApiUrl);
                  hostname = parsed.hostname;
                  isSecure = parsed.protocol === 'https:';
                } catch (e) {
                  // ignore
                }
              }

              const protocol = isSecure ? 'https:' : 'http:';
              // If it's a remote backend (not localhost), use the proxy route
              const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
              const strPort = backendApiUrl ? (new URL(backendApiUrl).port) : '3001';
              const baseUrlPort = strPort ? `:${strPort}` : '';

              const url = isLocal
                ? `http://${hostname}:${port}/`
                : `${protocol}//${hostname}${baseUrlPort}/proxy/${port}/`;

              // Only emit if we haven't emitted this port recently to avoid duplicate events
              if (self.queuedPort?.port !== port) {
                // Simple dedup check
                if (self.portListener) {
                  self.portListener(port, 'open', url);
                } else {
                  self.queuedPort = { port, url };
                }
              }
            }

            // Process complete lines
            const lines = lineBuffer.split('\n');
            // Keep the last part which might be incomplete
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              // Strip ANSI codes
              const cleanLine = line.replace(
                /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
                '',
              );

              // We kept the loop just in case, but the buffer check above handles the critical case.
              // We don't need to duplicate the logic here if we trust the buffer check.
              // But strictly speaking, lines processed here are "done".
            }
          } else if (msg.type === 'file_change') {
            // Sync backend file changes (mkdir, touch, rm, etc.) to frontend file explorer
            const relPath = msg.path as string;
            const fullPath = `/home/project/${relPath}`;

            if (msg.eventType === 'unlink' || msg.eventType === 'unlinkDir') {
              useFilesStore.getState().setFile(fullPath, undefined);
            } else if (msg.eventType === 'addDir') {
              useFilesStore.getState().setFile(fullPath, { type: 'folder' });
            } else {
              // 'add' or 'change'
              useFilesStore.getState().setFile(fullPath, {
                type: 'file',
                content: msg.content || '',
                isBinary: false,
              });
            }
          } else if (msg.type === 'exit') {
            // controller.close(); // Optional
          }
        };
        ws.onclose = () => {
          self.activeWebSockets.delete(ws);
          try {
            controller.close();
          } catch (e) { }
        };
        ws.onerror = (e) => {
          // Expected when backend is temporarily unreachable (e.g. restarting)
          console.warn(
            '[RemoteWebContainer] WS connection failed — backend may be starting up',
          );
          try {
            controller.error(e);
          } catch (_) { }
        };
      },
    });

    const inputStream = new WritableStream({
      write(chunk) {
        if (ws.readyState === WebSocket.OPEN) {
          let text = '';
          if (typeof chunk === 'string') {
            text = chunk;
          } else if (
            chunk instanceof Uint8Array ||
            chunk instanceof ArrayBuffer
          ) {
            text = new TextDecoder().decode(chunk);
          } else {
            try {
              // Defensive fallback for objects like { type: 'key', key: 'a' }
              text = String(chunk);
            } catch (e) {
              console.error(
                '[RemoteWebContainer] Failed to decode input chunk:',
                e,
              );
              return;
            }
          }
          ws.send(JSON.stringify({ type: 'input', data: text }));
        }
      },
    });

    await new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.OPEN) resolve();
      ws.onopen = () => resolve();
    });

    // Force bind to all interfaces to solve localhost connection issues on Mac
    if (command === 'npm' && args.includes('run')) {
      // Check if we already have --host
      if (!args.includes('--host')) {
        // Check if we need -- to pass args to script
        if (!args.includes('--')) {
          args.push('--');
        }
        args.push('--host');
      }
    }

    ws.send(
      JSON.stringify({
        type: 'start',
        projectId: this.sandboxId,
        command: command,
        args: args,
        cols: options?.terminal?.cols,
        rows: options?.terminal?.rows,
      }),
    );

    // Start sending buffered input once the process is spawned
    // (Handled by the backend socket listener)

    const exitPromise = new Promise<number>((resolve) => {
      ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'exit') {
          resolve(msg.exitCode ?? 0);
          ws.close();
        }
      });
    });

    return {
      output: outputStream,
      input: inputStream,
      exit: exitPromise,
      resize: (cols: number, rows: number) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      },
      kill: () => {
        ws.close();
      },
    } as unknown as WebContainerProcess;
  }

  fs: any = {
    readFile: async (path: string, encoding?: string) => {
      try {
        const res = await window.fetch(
          `${BACKEND_URL}/project/${this.sandboxId}/file?path=${encodeURIComponent(path)}`,
        );
        if (!res.ok) throw new Error('File not found');
        const data = await res.json();
        const content = data.content;

        if (encoding === 'utf-8' || encoding === 'utf8') {
          return content;
        } else {
          // Return Uint8Array by default if no encoding specified
          return new TextEncoder().encode(content);
        }
      } catch (e) {
        throw e;
      }
    },
    // ... rest of fs methods same as before ...
    writeFile: async (path: string, content: string | Uint8Array) => {
      const contentStr =
        typeof content === 'string'
          ? content
          : new TextDecoder().decode(content);

      const files = { [path]: contentStr };
      await window.fetch(`${BACKEND_URL}/project/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.sandboxId, files }),
      });

      const event = {
        type: 'change',
        path: path.startsWith('/') ? path : `/home/project/${path}`,
        buffer:
          typeof content === 'string'
            ? new TextEncoder().encode(content)
            : content,
      };

      if (this.watcherCallback) {
        this.watcherCallback([event]);
      } else {
        this.queuedEvents.push(event);
      }
    },
    mkdir: async (path: string, options?: { recursive?: boolean }) => {
      const event = {
        type: 'add_dir',
        path: path.startsWith('/') ? path : `/home/project/${path}`,
      };
      if (this.watcherCallback) {
        this.watcherCallback([event]);
      } else {
        this.queuedEvents.push(event);
      }
    },
    readdir: async (path: string) => {
      try {
        // If requesting node_modules, we might fail if it's not fully there,
        // but let's try.
        const res = await window.fetch(
          `${BACKEND_URL}/project/${this.sandboxId}/dir?path=${encodeURIComponent(path)}`,
        );
        const data = await res.json();

        if (!data.success || data.exists === false) {
          throw new Error('Directory not found');
        }

        return data.files;
      } catch (e) {
        throw e;
      }
    },
    rm: async (path: string, options?: any) => {
      const event = {
        type: 'remove_file',
        path: path.startsWith('/') ? path : `/home/project/${path}`,
      };
      if (this.watcherCallback) {
        this.watcherCallback([event]);
      } else {
        this.queuedEvents.push(event);
      }
    },
    rename: async (oldPath: string, newPath: string) => {
      console.warn('[RemoteWebContainer] fs.rename not implemented');
    },
    watch: (path: string, options: any, callback: any) => {
      console.warn('[RemoteWebContainer] fs.watch not implemented');
      return () => { };
    },
  };

  on(event: string, listener: (...args: any[]) => void) {
    if (event === 'port') {
      this.portListener = listener;
      if (this.queuedPort) {
        listener(this.queuedPort.port, 'open', this.queuedPort.url);
        this.queuedPort = null;
      }
    }
    return () => {
      if (event === 'port') this.portListener = null;
    };
  }

  internal: any = {
    watchPaths: (options: any, callback: any) => {
      this.watcherCallback = callback;

      // Flush any queued events immediately
      this.flushEvents();

      return () => {
        this.watcherCallback = null;
      };
    },
  };

  private flattenTree(
    tree: FileSystemTree,
    prefix = '',
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, entry] of Object.entries(tree)) {
      const path = prefix ? `${prefix}/${name}` : name;
      if ('file' in entry) {
        const contents = entry.file.contents;
        result[path] =
          typeof contents === 'string'
            ? contents
            : new TextDecoder().decode(contents);
      } else if ('directory' in entry) {
        Object.assign(result, this.flattenTree(entry.directory, path));
      }
    }
    return result;
  }
}
