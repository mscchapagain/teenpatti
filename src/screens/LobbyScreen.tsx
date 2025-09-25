import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const mockTables = [
  { id: 't1', minBet: 10, players: 2 },
  { id: 't2', minBet: 50, players: 4 },
  { id: 't3', minBet: 100, players: 1 },
];

export default function LobbyScreen({ navigation }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Lobby</Text>
      <FlatList
        data={mockTables}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={s.card}
            onPress={() => navigation.navigate('Table', { tableId: item.id })}
          >
            <Text style={s.cardTitle}>Table {item.id.toUpperCase()}</Text>
            <Text style={s.cardSub}>
              Min bet: {item.minBet} • Players: {item.players}/6
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0f14', padding: 16 },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#121922', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  cardSub: { color: '#9fb3c8', marginTop: 4 },
});
