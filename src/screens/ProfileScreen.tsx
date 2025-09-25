import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Profile</Text>
      <Text style={s.sub}>ID: {user?.id}</Text>
      <Text style={s.sub}>Name: {user?.displayName}</Text>
      <Pressable style={s.btn} onPress={signOut}>
        <Text style={s.btnTxt}>Sign out</Text>
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
    gap: 8,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#9fb3c8' },
  btn: {
    backgroundColor: '#E84F62',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  btnTxt: { color: 'white', fontWeight: '700' },
});
