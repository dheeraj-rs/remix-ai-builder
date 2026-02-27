import { useWorkbenchStore } from '../../stores/zustand';

export const stripAnsi = (str: string) => {
  let clean = str
    .replace(/\x1b\[(\d+)?D/g, (match, p1) =>
      '\x08'.repeat(p1 ? parseInt(p1, 10) : 1),
    )
    .replace(/\x1b\[[0-2]?K|\x1b\[(\d+)?G/g, '\r');

  clean = clean.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    '',
  );

  while (clean.includes('\x08')) {
    clean = clean.replace(/[^\x08]\x08/g, '').replace(/^\x08+/g, '');
  }

  clean = clean
    .split('\n')
    .map((line) => {
      return line.split('\r').reduce((acc, curr) => curr || acc, '');
    })
    .join('\n');
  return clean.replace(/\n{3,}/g, '\n\n');
};

export function isDevServerCommand(command: string): boolean {
  const devPatterns = [
    /npm\s+run\s+dev/,
    /npm\s+run\s+start/,
    /npm\s+run\s+serve/,
    /npm\s+start/,
    /yarn\s+dev/,
    /yarn\s+start/,
    /pnpm\s+dev/,
    /pnpm\s+start/,
    /vite/,
    /next\s+dev/,
    /astro\s+dev/,
  ];

  return devPatterns.some((pattern) => pattern.test(command));
}

export function extractDevServerUrl(output: string): string | null {
  const urlMatch =
    output.match(
      /(?:local|listening on|server running|server started).*?(http:\/\/(?:localhost|127\.0\.0\.1):(\d+))/i,
    ) || output.match(/(http:\/\/(?:localhost|127\.0\.0\.1):(\d+))/i);

  if (urlMatch) {
    useWorkbenchStore.getState().setBuildError(false);
    return urlMatch[1];
  }
  const readyMatch = output.match(/ready in \d+/i);
  if (readyMatch) {
    const portMatch = output.match(/:(\d{4,5})(?:\/|\s|$)/);
    if (portMatch) {
      useWorkbenchStore.getState().setBuildError(false);
      return `http://localhost:${portMatch[1]}`;
    }
    useWorkbenchStore.getState().setBuildError(false);
    return 'http://localhost:5173';
  }

  return null;
}
