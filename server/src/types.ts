export type SeatPos = 0 | 1 | 2 | 3 | 4 | 5;
export type PlayerId = string;

export interface TableSummary {
  id: string;
  minBet: number;
  maxPlayers: number;
  players: number;
}

export interface TableState extends TableSummary {
  dealerPos: SeatPos | null;
  turnPos: SeatPos | null;
  stake: number;
  pot: number;
  seats: Array<{
    pos: SeatPos;
    userId: PlayerId | null;
    displayName: string | null;
    ready: boolean;
    seen: boolean;
    totalBet: number;
    inHand: boolean;
  }>;
  phase: 'WAITING' | 'COLLECT_BOOT' | 'DEAL' | 'BETTING' | 'SHOWDOWN' | 'WINNER';
}
