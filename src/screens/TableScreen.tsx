import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useRealtime, type TableSeat, type TableState } from '../realtime/RealtimeProvider';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

type Message = { id: string; text: string };

export default function TableScreen({ route, navigation }: Props) {
  const { tableId } = route.params;
  const { user } = useAuth();
  const { status, sessionId, send, subscribe } = useRealtime();
  const [messages, setMessages] = useState<Message[]>([]);
  const [tableState, setTableState] = useState<TableState | null>(null);

  const appendMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text },
    ]);
  }, []);

  useEffect(() => {
    const unsubscribeSystem = subscribe('table:system', (payload) => {
      if (payload.tableId === tableId) {
        appendMessage(payload.message);
      }
    });
    const unsubscribeError = subscribe('error', (payload) => {
      appendMessage(`Error: ${payload.message}`);
    });
    const unsubscribeState = subscribe('table:state', (payload) => {
      if (payload.table.id === tableId) {
        setTableState(payload.table);
      }
    });

    return () => {
      unsubscribeSystem();
      unsubscribeError();
      unsubscribeState();
    };
  }, [appendMessage, subscribe, tableId]);

  useEffect(() => {
    if (status === 'open') {
      send({ type: 'table:join', tableId, displayName: user?.displayName });
    }

    return () => {
      if (status === 'open') {
        send({ type: 'table:leave', tableId });
      }
      setTableState(null);
    };
  }, [send, status, tableId, user?.displayName]);

  const connectionLabel = useMemo(() => {
    switch (status) {
      case 'open':
        return 'Live';
      case 'connecting':
        return 'Connecting…';
      default:
        return 'Reconnecting…';
    }
  }, [status]);

  const yourSeat = useMemo<TableSeat | null>(() => {
    if (!tableState || !sessionId) return null;
    return tableState.seats.find((seat) => seat.userId === sessionId) ?? null;
  }, [sessionId, tableState]);

  const isReady = yourSeat?.ready ?? false;

  const toggleReady = useCallback(() => {
    if (status !== 'open' || !yourSeat) return;
    send({ type: 'table:ready', tableId, ready: !isReady });
  }, [isReady, send, status, tableId, yourSeat]);

  const tableMeta = useMemo(() => {
    if (!tableState) return null;
    return [
      `Min bet ${tableState.minBet}`,
      `Stake ${tableState.stake}`,
      `Pot ${tableState.pot}`,
    ].join(' • ');
  }, [tableState]);

  const seats = useMemo<TableSeat[]>(() => {
    if (tableState) {
      return tableState.seats;
    }
    return Array.from({ length: 6 }, (_, idx) => ({
      pos: idx,
      userId: null,
      displayName: null,
      ready: false,
      seen: false,
      totalBet: 0,
      inHand: false,
    }) as TableSeat);
  }, [tableState]);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>Table {tableId.toUpperCase()}</Text>
        <Text style={[s.status, status === 'open' ? s.statusOk : s.statusWarn]}>{connectionLabel}</Text>
      </View>
      <Text style={s.sub}>{tableMeta ?? 'Waiting for table state…'}</Text>
      <View style={s.seatsGrid}>
        {seats.map((seat) => {
          const seatNumber = seat.pos + 1;
          const occupied = Boolean(seat.userId);
          const ready = seat.ready;
          const isYou = seat.userId === sessionId;
          return (
            <View
              key={seat.pos}
              style={[s.seatCard, occupied ? s.seatOccupied : s.seatEmpty]}>
              <Text style={s.seatTitle}>Seat {seatNumber}</Text>
              <Text style={s.seatName}>{occupied ? seat.displayName ?? 'Player' : 'Open seat'}</Text>
              {occupied ? (
                <Text style={s.seatMeta}>{ready ? 'Ready' : 'Not ready'}</Text>
              ) : (
                <Text style={s.seatMeta}>Tap table in lobby to join</Text>
              )}
              {isYou ? <Text style={s.youTag}>You</Text> : null}
            </View>
          );
        })}
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={s.feed}
        contentContainerStyle={messages.length === 0 ? s.feedEmpty : undefined}
        renderItem={({ item }) => <Text style={s.msg}>{item.text}</Text>}
        ListEmptyComponent={<Text style={s.emptyText}>Waiting for activity…</Text>}
      />
      {yourSeat ? (
        <Pressable style={[s.btn, isReady ? s.btnReady : null]} onPress={toggleReady}>
          <Text style={[s.btnTxt, isReady ? s.btnTxtReady : null]}>
            {isReady ? 'Set as Not Ready' : 'Ready Up'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable style={s.btn} onPress={() => navigation.goBack()}>
        <Text style={s.btnTxt}>Back to Lobby</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0f14', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  status: { color: '#9fb3c8', fontSize: 13 },
  statusOk: { color: '#4ce3b4' },
  statusWarn: { color: '#f0a75e' },
  sub: { color: '#9fb3c8', marginTop: 8, marginBottom: 12 },
  seatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  seatCard: {
    flexBasis: '48%',
    backgroundColor: '#121922',
    borderRadius: 12,
    padding: 12,
  },
  seatEmpty: {
    borderWidth: 1,
    borderColor: '#22303d',
  },
  seatOccupied: {
    borderWidth: 1,
    borderColor: '#3053ff33',
  },
  seatTitle: { color: '#9fb3c8', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  seatName: { color: '#e1ecf4', fontSize: 16, fontWeight: '600' },
  seatMeta: { color: '#9fb3c8', marginTop: 4, fontSize: 12 },
  youTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#00d6a31a',
    color: '#00d6a3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  feed: {
    flexGrow: 0,
    flex: 1,
    backgroundColor: '#121922',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  feedEmpty: { flex: 1, justifyContent: 'center' },
  msg: { color: '#e1ecf4', marginBottom: 8 },
  emptyText: { color: '#9fb3c8', textAlign: 'center' },
  btn: {
    backgroundColor: '#00d6a3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  btnReady: {
    backgroundColor: '#1f2d3a',
    borderWidth: 1,
    borderColor: '#00d6a3',
  },
  btnTxt: { color: '#001018', fontWeight: '700' },
  btnTxtReady: { color: '#00d6a3' },
});
