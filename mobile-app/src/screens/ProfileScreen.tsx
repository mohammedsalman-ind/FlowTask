import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppButton, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const paddingBottom = useSafeBottomPadding(34);
  const [reminders, setReminders] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Logout failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleBiometric = async (enabled: boolean) => {
    if (!enabled) {
      setBiometric(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert('Biometric login unavailable', 'Set up biometrics on this device first.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric login for FlowTask' });
    setBiometric(result.success);
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[styles.content, { paddingBottom }]}>
      <Text style={[styles.title, { color: theme.text }]}>Profile</Text>

      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="person" size={28} color={theme.primary} />
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.name, { color: theme.text }]}>{user?.user_metadata?.name || 'FlowTask User'}</Text>
            <Text style={[styles.email, { color: theme.muted }]}>{user?.email || 'No email available'}</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
      <Card>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Ionicons name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={22} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Dark mode</Text>
              <Text style={[styles.settingSubtitle, { color: theme.muted }]}>Switch the app theme</Text>
            </View>
          </View>
          <Switch value={mode === 'dark'} onValueChange={toggleTheme} thumbColor="#FFFFFF" trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Ionicons name="finger-print-outline" size={22} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Biometric login</Text>
              <Text style={[styles.settingSubtitle, { color: theme.muted }]}>Unlock faster on this device</Text>
            </View>
          </View>
          <Switch value={biometric} onValueChange={handleBiometric} thumbColor="#FFFFFF" trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Ionicons name="notifications-outline" size={22} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Task reminders</Text>
              <Text style={[styles.settingSubtitle, { color: theme.muted }]}>Due date and meeting follow-up alerts</Text>
            </View>
          </View>
          <Switch value={reminders} onValueChange={setReminders} thumbColor="#FFFFFF" trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
      <Card>
        <SettingsLink icon="shield-checkmark-outline" title="Privacy" subtitle="Your tasks are scoped to your Supabase account" />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity onPress={() => Alert.alert('Rate FlowTask', 'Store rating will open after the production listing is published.')}>
          <SettingsLink icon="star-outline" title="Rate FlowTask" subtitle="Support the app with a quick rating" />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity onPress={() => Share.share({ message: 'Try FlowTask, a productivity app with AI meeting follow-ups.' })}>
          <SettingsLink icon="share-social-outline" title="Share app" subtitle="Invite a teammate" />
        </TouchableOpacity>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>About FlowTask</Text>
      <Card>
        <Text style={[styles.about, { color: theme.muted }]}>
          FlowTask combines task planning, calendar focus, and AI meeting follow-ups into a mobile-first productivity workflow.
        </Text>
        <View style={styles.aboutRow}>
          <Ionicons name="phone-portrait-outline" size={18} color={theme.primary} />
          <Text style={[styles.aboutMeta, { color: theme.text }]}>Expo SDK 54 mobile app</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="server-outline" size={18} color={theme.primary} />
          <Text style={[styles.aboutMeta, { color: theme.text }]}>Supabase auth and data</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
          <Text style={[styles.aboutMeta, { color: theme.text }]}>Version 1.0.0</Text>
        </View>
      </Card>

      <AppButton label="Logout" icon="log-out-outline" variant="danger" onPress={handleLogout} loading={loggingOut} disabled={loggingOut} />
      <TouchableOpacity disabled style={styles.version}>
        <Text style={[styles.versionText, { color: theme.muted }]}>FlowTask 1.0.0</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingsLink({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabel}>
        <Ionicons name={icon} size={22} color={theme.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.muted }]}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 34 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  profileText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '900', marginBottom: 3 },
  email: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 12, marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { marginLeft: 12, flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '900' },
  settingSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  divider: { height: 1, marginVertical: 14 },
  about: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  aboutMeta: { marginLeft: 9, fontSize: 14, fontWeight: '800' },
  version: { paddingVertical: 16 },
  versionText: { textAlign: 'center', fontSize: 12, fontWeight: '800' },
});
