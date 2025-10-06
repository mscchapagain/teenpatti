import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

export type TableSummary = { id: string; minBet: number; players: number };

export type ServerMessage =
  | { type: 'lobby:data'; tables: TableSummary[] }
  | { type: 'table:system'; tableId: string; message: string }
  | { type: 'error'; message: string };

export type ClientMessage =
  | { type: 'lobby:subscribe' }
  | { type: 'lobby:unsubscribe' }
  | { type: 'table:join'; tableId: string; displayName?: string }
  | { type: 'table:leave'; tableId: string };

type RealtimeStatus = 'connecting' | 'open' | 'closed';

type RealtimeContextValue = {
  status: RealtimeStatus;
  send: (message: ClientMessage) => void;
  subscribe: <T extends ServerMessage['type']>(
    type: T,
    handler: (payload: Extract<ServerMessage, { type: T }>) => void,
  ) => () => void;
};

const DEFAULT_VALUE: RealtimeContextValue = {
  status: 'closed',
  send: () => {},
  subscribe: () => () => {},
};

const SERVER_URL = Platform.select({
  android: 'ws://10.0.2.2:4000',
  ios: 'ws://localhost:4000',
  default: 'ws://localhost:4000',
});

const RealtimeContext = createContext<RealtimeContextValue>(DEFAULT_VALUE);

export function RealtimeProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<
    Map<ServerMessage['type'], Set<(payload: ServerMessage) => void>>
  >(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const closingRef = useRef(false);

  useEffect(() => {
    function clearTimer() {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    }

    const isSupported = typeof globalThis.WebSocket !== 'undefined';
    if (!isSupported) {
      setStatus('closed');
      return () => {};
    }

    const resolvedUrl = SERVER_URL ?? 'ws://localhost:4000';

    function connect() {
      clearTimer();
      setStatus('connecting');
      const socket = new globalThis.WebSocket(resolvedUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
        setStatus('open');
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closingRef.current) return;
        setStatus('closed');
        reconnectAttempts.current += 1;
        const delay = Math.min(5000, 500 * reconnectAttempts.current);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        setStatus('closed');
      };

      socket.onmessage = (event) => {
        let data: ServerMessage;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.warn('Failed to parse realtime message', err);
          return;
        }

        if (!data || typeof data !== 'object' || !('type' in data)) {
          return;
        }

        const handlers = listenersRef.current.get((data as ServerMessage).type);
        if (!handlers?.size) return;
        handlers.forEach((handler) => {
          handler(data);
        });
      };
    }

    connect();

    return () => {
      closingRef.current = true;
      clearTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback<RealtimeContextValue['subscribe']>((type, handler) => {
    let listeners = listenersRef.current.get(type);
    if (!listeners) {
      listeners = new Set();
      listenersRef.current.set(type, listeners);
    }
    const wrapped = handler as unknown as (payload: ServerMessage) => void;
    listeners.add(wrapped);

    return () => {
      listeners?.delete(wrapped);
      if (listeners && listeners.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({ status, send, subscribe }),
    [send, status, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
