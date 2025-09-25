import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Settings</Text>
      <Text style={s.sub}>camera/mic toggles later</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0f14', alignItems: 'center', justifyContent: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  sub: { color: '#9fb3c8', marginTop: 8 },
});
