import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton, Field, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn, resetPassword } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Reset email sent', 'Check your inbox for the password reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.brandRow}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoText}>F</Text>
          </View>
          <Text style={[styles.brand, { color: theme.text }]}>FlowTask</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Sign in to manage tasks, calendar work, and AI meeting actions.</Text>

        <Field value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
        <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

        <AppButton label="Log In" icon="log-in-outline" onPress={handleLogin} loading={loading} disabled={loading} />
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={[styles.secondaryLink, { color: theme.muted }]}>Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={[styles.linkText, { color: theme.primary }]}>Create an account</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  logo: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  brand: { fontSize: 21, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  error: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  linkText: { marginTop: 16, textAlign: 'center', fontWeight: '800' },
  secondaryLink: { marginTop: 14, textAlign: 'center', fontWeight: '700' },
});
