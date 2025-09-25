import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function AuthScreen() {
  const { signInGuest } = useAuth();
  const [name, setName] = useState('');

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Teen Patti</Text>
      <Text style={s.subtitle}>Enter a display name to continue</Text>
      <TextInput
        style={s.input}
        placeholder="Your name"
        placeholderTextColor="#6c7a89"
        value={name}
        onChangeText={setName}
        maxLength={18}
      />
      <Pressable style={s.btn} onPress={() => signInGuest(name)}>
        <Text style={s.btnTxt}>Continue as Guest</Text>
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
  title: { color: 'white', fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9fb3c8', marginBottom: 16 },
  input: {
    width: '100%',
    backgroundColor: '#121922',
    color: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  btn: { backgroundColor: '#00d6a3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnTxt: { color: '#001018', fontWeight: '700' },
});
