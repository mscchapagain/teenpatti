import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TabsParamList } from '../navigation/MainTabs';
import { useRealtime, type TableSummary } from '../realtime/RealtimeProvider';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Lobby'>,
  NativeStackScreenProps<RootStackParamList, 'MainTabs'>
>;

export default function LobbyScreen({ navigation }: Props) {
  const { status, send, subscribe } = useRealtime();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeData = subscribe('lobby:data', (payload) => {
      setTables(payload.tables);
      setError(null);
    });
    const unsubscribeError = subscribe('error', (payload) => {
      setError(payload.message);
    });

    return () => {
      unsubscribeData();
      unsubscribeError();
    };
  }, [subscribe]);

  useEffect(() => {
    if (status === 'open') {
      send({ type: 'lobby:subscribe' });
    }

    return () => {
      if (status === 'open') {
        send({ type: 'lobby:unsubscribe' });
      }
    };
  }, [send, status]);

  const connectionLabel = useMemo(() => {
    switch (status) {
      case 'open':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      default:
        return 'Reconnecting…';
    }
  }, [status]);

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.title}>Lobby</Text>
        <Text style={[s.status, status === 'open' ? s.statusOk : s.statusWarn]}>{connectionLabel}</Text>
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={tables}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={s.card}
            onPress={() => navigation.navigate('Table', { tableId: item.id })}
          >
            <Text style={s.cardTitle}>Table {item.id.toUpperCase()}</Text>
            <Text style={s.cardSub}>
              Min bet: {item.minBet} • Players: {item.players}/{item.maxPlayers}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {status === 'open' ? 'No tables available yet.' : 'Waiting for realtime lobby…'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0f14', padding: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { color: 'white', fontSize: 24, fontWeight: '700' },
  status: { fontSize: 13, color: '#9fb3c8' },
  statusOk: { color: '#4ce3b4' },
  statusWarn: { color: '#f0a75e' },
  error: { color: '#ff6f6f', marginBottom: 8 },
  card: { backgroundColor: '#121922', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  cardSub: { color: '#9fb3c8', marginTop: 4 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#9fb3c8' },
});
