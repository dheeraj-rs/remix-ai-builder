declare module 'istextorbinary' {
  export function getEncoding(
    buffer: Buffer | Uint8Array,
    options?: any,
    callback?: any,
  ): 'utf8' | 'binary';
}
