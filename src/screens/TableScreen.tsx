import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useRealtime } from '../realtime/RealtimeProvider';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

type Message = { id: string; text: string };

export default function TableScreen({ route, navigation }: Props) {
  const { tableId } = route.params;
  const { user } = useAuth();
  const { status, send, subscribe } = useRealtime();
  const [messages, setMessages] = useState<Message[]>([]);

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

    return () => {
      unsubscribeSystem();
      unsubscribeError();
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

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>Table {tableId.toUpperCase()}</Text>
        <Text style={[s.status, status === 'open' ? s.statusOk : s.statusWarn]}>{connectionLabel}</Text>
      </View>
      <Text style={s.sub}>Realtime updates</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={s.feed}
        contentContainerStyle={messages.length === 0 ? s.feedEmpty : undefined}
        renderItem={({ item }) => <Text style={s.msg}>{item.text}</Text>}
        ListEmptyComponent={<Text style={s.emptyText}>Waiting for activity…</Text>}
      />
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
  },
  btnTxt: { color: '#001018', fontWeight: '700' },
});
