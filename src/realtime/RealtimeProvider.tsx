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

export type TableSummary = {
  id: string;
  minBet: number;
  maxPlayers: number;
  players: number;
};

export type TableSeat = {
  pos: number;
  userId: string | null;
  displayName: string | null;
  ready: boolean;
  seen: boolean;
  totalBet: number;
  inHand: boolean;
};

export type TableState = {
  id: string;
  minBet: number;
  maxPlayers: number;
  players: number;
  dealerPos: number | null;
  turnPos: number | null;
  stake: number;
  pot: number;
  seats: TableSeat[];
  phase: 'WAITING' | 'COLLECT_BOOT' | 'DEAL' | 'BETTING' | 'SHOWDOWN' | 'WINNER';
};

export type ServerMessage =
  | { type: 'lobby:data'; tables: TableSummary[] }
  | { type: 'table:system'; tableId: string; message: string }
  | { type: 'table:state'; table: TableState }
  | { type: 'session:info'; id: string }
  | { type: 'error'; message: string };

export type ClientMessage =
  | { type: 'lobby:subscribe' }
  | { type: 'lobby:unsubscribe' }
  | { type: 'table:join'; tableId: string; displayName?: string }
  | { type: 'table:leave'; tableId: string }
  | { type: 'table:ready'; tableId: string; ready: boolean };

type RealtimeStatus = 'connecting' | 'open' | 'closed';

type RealtimeContextValue = {
  status: RealtimeStatus;
  sessionId: string | null;
  send: (message: ClientMessage) => void;
  subscribe: <T extends ServerMessage['type']>(
    type: T,
    handler: (payload: Extract<ServerMessage, { type: T }>) => void,
  ) => () => void;
};

const DEFAULT_VALUE: RealtimeContextValue = {
  status: 'closed',
  sessionId: null,
  send: () => {},
  subscribe: () => () => {},
};

const SERVER_URL = Platform.select({
  android: 'ws://10.0.2.2:4000',
  ios: 'ws://localhost:4000',
  default: 'ws://localhost:4000',
});

const RealtimeContext = createContext<RealtimeContextValue>(DEFAULT_VALUE);

type NativeSocket = InstanceType<typeof globalThis.WebSocket> & { ping?: () => void };

export function RealtimeProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<NativeSocket | null>(null);
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
      closingRef.current = false;
      clearTimer();
      setStatus('connecting');
      const socket = new globalThis.WebSocket(resolvedUrl) as NativeSocket;
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
        setStatus('open');
      };

      socket.onclose = () => {
        socketRef.current = null;
        setSessionId(null);
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

        if ((data as ServerMessage).type === 'session:info') {
          setSessionId((data as Extract<ServerMessage, { type: 'session:info' }>).id);
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
    () => ({ status, sessionId, send, subscribe }),
    [send, sessionId, status, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
