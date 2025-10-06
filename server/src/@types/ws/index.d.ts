import type http from 'http';

declare module 'ws' {
  export type RawData = string | Buffer | ArrayBuffer | Buffer[];

  export class WebSocket {
    static readonly OPEN: number;
    readyState: number;
    send(data: string): void;
    close(): void;
    on(event: 'message', listener: (data: RawData) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'open', listener: () => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }

  export interface WebSocketServerOptions {
    server: http.Server;
  }

  export class WebSocketServer {
    constructor(options: WebSocketServerOptions);
    clients: Set<WebSocket>;
    on(event: 'connection', listener: (socket: WebSocket) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
