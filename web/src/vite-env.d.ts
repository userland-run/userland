/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '@xterm/xterm/css/xterm.css' {
  const content: string;
  export default content;
}

// Extend FileSystemDirectoryHandle with iterator methods
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}
