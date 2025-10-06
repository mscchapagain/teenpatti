import express from 'express';
import http from 'http';
import cors from 'cors';
// @ts-expect-error - custom type declarations for ws are provided in src/@types
import { WebSocketServer, WebSocket } from 'ws';
// @ts-expect-error - custom type declarations for ws are provided in src/@types
import type { RawData } from 'ws';
import { TableManager } from './tables';

const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.send('Teen Patti realtime server OK'));

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const tables = new TableManager();
const memberSets = new Map<string, Set<WebSocket>>();

const DEFAULT_TABLES: Array<{ id: string; minBet: number; maxPlayers: number }> = [
  { id: 't1', minBet: 10, maxPlayers: 6 },
  { id: 't2', minBet: 25, maxPlayers: 6 },
  { id: 't3', minBet: 100, maxPlayers: 6 },
];

function ensureMemberSet(tableId: string) {
  let set = memberSets.get(tableId);
  if (!set) {
    set = new Set<WebSocket>();
    memberSets.set(tableId, set);
  }
  return set;
}

for (const { id, minBet, maxPlayers } of DEFAULT_TABLES) {
  tables.ensureTable(id, minBet, maxPlayers);
  ensureMemberSet(id);
}

function buildLobbySummary() {
  return tables.list();
}

type ClientMessage =
  | { type: 'lobby:subscribe' }
  | { type: 'lobby:unsubscribe' }
  | { type: 'lobby:list' }
  | { type: 'table:join'; tableId: string; displayName?: string }
  | { type: 'table:leave'; tableId: string }
  | { type: 'table:ready'; tableId: string; ready: boolean };

type Session = {
  id: string;
  displayName?: string;
  tableId?: string;
};

const sessions = new Map<WebSocket, Session>();

function generateSessionId() {
  return 'ws_' + Math.random().toString(36).slice(2, 10);
}

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastLobby() {
  const payload = JSON.stringify({ type: 'lobby:data', tables: buildLobbySummary() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function notifyTable(tableId: string, message: string, exclude?: WebSocket) {
  const payload = JSON.stringify({ type: 'table:system', tableId, message });
  const members = ensureMemberSet(tableId);
  for (const client of members) {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(payload);
    }
  }
}

function pushTableState(tableId: string) {
  const table = tables.get(tableId);
  if (!table) return;
  const payload = JSON.stringify({ type: 'table:state', table });
  const members = ensureMemberSet(tableId);
  for (const client of members) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function leaveTable(ws: WebSocket, options?: { silent?: boolean }) {
  const session = sessions.get(ws);
  if (!session?.tableId) return;
  const { tableId } = session;
  const members = ensureMemberSet(tableId);
  members.delete(ws);
  tables.leave(tableId, session.id);

  const displayName = session.displayName ?? `Player ${session.id.slice(-4)}`;
  if (!options?.silent) {
    send(ws, { type: 'table:system', tableId, message: `You left table ${tableId}` });
  }
  notifyTable(tableId, `${displayName} left the table`, ws);

  session.tableId = undefined;
  pushTableState(tableId);
  broadcastLobby();
}

function joinTable(ws: WebSocket, tableId: string, displayName?: string) {
  const session = sessions.get(ws);
  if (!session) return;

  if (!tables.get(tableId)) {
    send(ws, { type: 'error', message: 'Unknown table' });
    return;
  }

  if (session.tableId === tableId) {
    pushTableState(tableId);
    return;
  }

  if (session.tableId) {
    leaveTable(ws, { silent: true });
  }

  session.displayName = displayName?.trim() || session.displayName || `Player ${session.id.slice(-4)}`;

  try {
    tables.seat(tableId, session.id, session.displayName);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'join_failed';
    send(ws, { type: 'error', message });
    return;
  }

  session.tableId = tableId;
  const members = ensureMemberSet(tableId);
  members.add(ws);

  send(ws, { type: 'table:system', tableId, message: `You joined table ${tableId}` });
  notifyTable(tableId, `${session.displayName} joined the table`, ws);
  pushTableState(tableId);
  broadcastLobby();
}

function setReady(ws: WebSocket, tableId: string, ready: boolean) {
  const session = sessions.get(ws);
  if (!session) return;
  if (session.tableId !== tableId) {
    send(ws, { type: 'error', message: 'not_at_table' });
    return;
  }

  try {
    tables.setReady(tableId, session.id, ready);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ready_failed';
    send(ws, { type: 'error', message });
    return;
  }

  notifyTable(tableId, `${session.displayName ?? 'Player'} is ${ready ? 'ready' : 'not ready'}`);
  pushTableState(tableId);
}

wss.on('connection', (ws: WebSocket) => {
  const session: Session = { id: generateSessionId() };
  sessions.set(ws, session);

  send(ws, { type: 'session:info', id: session.id });
  send(ws, { type: 'lobby:data', tables: buildLobbySummary() });

  ws.on('message', (raw: RawData) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.warn('Failed to parse message', err);
      return;
    }

    switch (msg.type) {
      case 'lobby:list':
      case 'lobby:subscribe':
        send(ws, { type: 'lobby:data', tables: buildLobbySummary() });
        break;
      case 'lobby:unsubscribe':
        break;
      case 'table:join':
        joinTable(ws, msg.tableId, msg.displayName);
        break;
      case 'table:leave':
        if (sessions.get(ws)?.tableId === msg.tableId) {
          leaveTable(ws);
        }
        break;
      case 'table:ready':
        setReady(ws, msg.tableId, msg.ready);
        break;
      default:
        send(ws, { type: 'error', message: 'Unknown event' });
    }
  });

  ws.on('close', () => {
    leaveTable(ws, { silent: true });
    sessions.delete(ws);
  });

  ws.on('error', (err: Error) => {
    console.error('WebSocket error', err);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Realtime server on http://localhost:${PORT}`);
});
