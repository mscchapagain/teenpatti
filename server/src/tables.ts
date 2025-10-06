import crypto from 'node:crypto';
import { TableState, TableSummary, SeatPos, PlayerId } from './types';

function createSeat(pos: SeatPos) {
  return {
    pos,
    userId: null as PlayerId | null,
    displayName: null as string | null,
    ready: false,
    seen: false,
    totalBet: 0,
    inHand: false,
  };
}

function initTable(id: string, minBet: number, maxPlayers: number): TableState {
  const seats = Array.from({ length: maxPlayers }, (_, idx) => createSeat(idx as SeatPos));
  return {
    id,
    minBet,
    maxPlayers,
    players: 0,
    dealerPos: null,
    turnPos: null,
    stake: minBet,
    pot: 0,
    seats,
    phase: 'WAITING',
  };
}

export class TableManager {
  private tables = new Map<string, TableState>();

  list(): TableSummary[] {
    return Array.from(this.tables.values()).map(({ id, minBet, maxPlayers, players }) => ({
      id,
      minBet,
      maxPlayers,
      players,
    }));
  }

  get(id: string) {
    return this.tables.get(id);
  }

  create(minBet = 10, maxPlayers = 6) {
    const id = crypto.randomUUID().slice(0, 8);
    const table = initTable(id, minBet, maxPlayers);
    this.tables.set(id, table);
    return table;
  }

  ensureTable(id: string, minBet = 10, maxPlayers = 6) {
    const existing = this.tables.get(id);
    if (existing) return existing;
    const table = initTable(id, minBet, maxPlayers);
    this.tables.set(id, table);
    return table;
  }

  seat(tableId: string, userId: PlayerId, displayName: string) {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error('table_not_found');
    }
    const seat = table.seats.find((s) => !s.userId);
    if (!seat) {
      throw new Error('table_full');
    }
    seat.userId = userId;
    seat.displayName = displayName;
    seat.ready = false;
    seat.seen = false;
    seat.totalBet = 0;
    seat.inHand = false;
    table.players = table.seats.filter((s) => Boolean(s.userId)).length;
    return seat.pos;
  }

  leave(tableId: string, userId: PlayerId) {
    const table = this.tables.get(tableId);
    if (!table) {
      return;
    }
    const seat = table.seats.find((s) => s.userId === userId);
    if (!seat) {
      return;
    }
    seat.userId = null;
    seat.displayName = null;
    seat.ready = false;
    seat.seen = false;
    seat.totalBet = 0;
    seat.inHand = false;
    table.players = table.seats.filter((s) => Boolean(s.userId)).length;
  }

  setReady(tableId: string, userId: PlayerId, ready: boolean) {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error('table_not_found');
    }
    const seat = table.seats.find((s) => s.userId === userId);
    if (!seat) {
      throw new Error('not_seated');
    }
    seat.ready = ready;
    return table;
  }
}
