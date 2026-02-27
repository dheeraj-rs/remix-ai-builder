import type { WebContainer } from '@webcontainer/api';
import type { ITerminal } from '../types/terminal';

export async function newShellProcess(
  webcontainer: WebContainer,
  terminal: ITerminal,
) {
  terminal.clear();

  const args: string[] = [];

  const process = await webcontainer.spawn('/bin/jsh', ['--osc', ...args], {
    terminal: {
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15,
    },
  });

  const input = process.input.getWriter();
  const output = process.output;

  (process as any).writeInput = (data: string) => {
    try {
      input.write(data);
    } catch (e) {
      console.error('[Shell] Manual writeInput failed:', e);
    }
  };

  output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    }),
  );

  terminal.onData((data) => {
    try {
      input.write(data);
    } catch (e) {
      console.error('[Shell] Failed to write to input stream:', e);
    }
  });

  return process;
}
