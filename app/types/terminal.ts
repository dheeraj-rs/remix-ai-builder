export interface ITerminal {
  readonly cols: number;
  readonly rows: number;

  onData(callback: (data: string) => void): { dispose: () => void };
  onResize(callback: (dims: { cols: number; rows: number }) => void): {
    dispose: () => void;
  };
  write(data: string | Uint8Array): void;
  clear(): void;
}
