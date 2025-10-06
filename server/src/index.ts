import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.send('Teen Patti realtime server OK'));

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

type Table = { id: string; minBet: number };
type TableSummary = Table & { players: number };

type ClientMessage =
  | { type: 'lobby:subscribe' }
  | { type: 'lobby:unsubscribe' }
  | { type: 'table:join'; tableId: string; displayName?: string }
  | { type: 'table:leave'; tableId: string };

type Session = {
  id: string;
  displayName?: string;
  tableId?: string;
};

const tables: Table[] = [
  { id: 't1', minBet: 10 },
  { id: 't2', minBet: 50 },
  { id: 't3', minBet: 100 },
];

const sessions = new Map<WebSocket, Session>();
const tableMembers = new Map<string, Set<WebSocket>>();

for (const table of tables) {
  tableMembers.set(table.id, new Set());
}

function generateSessionId() {
  return 'ws_' + Math.random().toString(36).slice(2, 10);
}

function buildLobbySummary(): TableSummary[] {
  return tables.map((table) => ({
    ...table,
    players: tableMembers.get(table.id)?.size ?? 0,
  }));
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
  const members = tableMembers.get(tableId);
  if (!members) return;
  for (const client of members) {
    if (client.readyState === WebSocket.OPEN && client !== exclude) {
      client.send(payload);
    }
  }
}

function leaveTable(ws: WebSocket, options?: { silent?: boolean }) {
  const session = sessions.get(ws);
  if (!session?.tableId) return;
  const { tableId } = session;
  const members = tableMembers.get(tableId);
  members?.delete(ws);

  const displayName = session.displayName ?? `Player ${session.id.slice(-4)}`;
  notifyTable(tableId, `${displayName} left the table`, ws);

  if (!options?.silent) {
    send(ws, { type: 'table:system', tableId, message: `You left table ${tableId}` });
  }

  session.tableId = undefined;
  broadcastLobby();
}

function joinTable(ws: WebSocket, tableId: string, displayName?: string) {
  if (!tableMembers.has(tableId)) {
    send(ws, { type: 'error', message: 'Unknown table' });
    return;
  }

  const session = sessions.get(ws);
  if (!session) return;

  if (session.tableId === tableId) {
    return;
  }

  if (session.tableId) {
    leaveTable(ws, { silent: true });
  }

  session.tableId = tableId;
  session.displayName = displayName?.trim() || session.displayName || `Player ${session.id.slice(-4)}`;

  const members = tableMembers.get(tableId);
  if (!members) return;

  members.add(ws);
  send(ws, { type: 'table:system', tableId, message: `You joined table ${tableId}` });
  notifyTable(tableId, `${session.displayName} joined the table`, ws);
  broadcastLobby();
}

wss.on('connection', (ws) => {
  const session: Session = { id: generateSessionId() };
  sessions.set(ws, session);

  send(ws, { type: 'lobby:data', tables: buildLobbySummary() });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.warn('Failed to parse message', err);
      return;
    }

    switch (msg.type) {
      case 'lobby:subscribe':
        send(ws, { type: 'lobby:data', tables: buildLobbySummary() });
        break;
      case 'lobby:unsubscribe':
        // no-op for now
        break;
      case 'table:join':
        joinTable(ws, msg.tableId, msg.displayName);
        break;
      case 'table:leave':
        if (sessions.get(ws)?.tableId === msg.tableId) {
          leaveTable(ws);
        }
        break;
      default:
        send(ws, { type: 'error', message: 'Unknown event' });
    }
  });

  ws.on('close', () => {
    leaveTable(ws, { silent: true });
    sessions.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error', err);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Realtime server on http://localhost:${PORT}`);
});
