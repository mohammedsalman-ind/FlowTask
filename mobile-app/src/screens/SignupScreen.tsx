import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AppButton, Field, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SignupScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Enter your name, email, and a password with at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Start with a real Supabase account and keep your tasks synced.</Text>

        <Field value={name} onChangeText={setName} placeholder="Name" />
        <Field value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
        <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

        <AppButton label="Sign Up" icon="person-add-outline" onPress={handleSignup} loading={loading} disabled={loading} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: theme.primary }]}>Already have an account?</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  error: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  linkText: { marginTop: 16, textAlign: 'center', fontWeight: '800' },
});
