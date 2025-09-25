import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

export default function TableScreen({ route, navigation }: Props) {
  const { tableId } = route.params;
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Table {tableId.toUpperCase()}</Text>
      <Text style={s.sub}>Video & realtime will appear here</Text>
      <View style={{ height: 16 }} />
      <Pressable style={s.btn} onPress={() => navigation.goBack()}>
        <Text style={s.btnTxt}>Back to Lobby</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0b0f14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  sub: { color: '#9fb3c8', marginTop: 8 },
  btn: {
    backgroundColor: '#00d6a3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  btnTxt: { color: '#001018', fontWeight: '700' },
});
