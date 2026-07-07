import React from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(16);
  return <View style={[styles.screen, { backgroundColor: theme.background, paddingBottom }, padded && styles.padded]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme } = useTheme();
  return <View style={[styles.card, cardColors(theme), style]}>{children}</View>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const background = variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.surfaceAlt;
  const color = variant === 'secondary' ? theme.text : '#FFFFFF';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: background, opacity: disabled || loading ? 0.65 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={color} style={styles.buttonIcon} /> : null}
          <Text style={[styles.buttonText, { color }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Field(props: TextInputProps) {
  const { theme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.muted}
      {...props}
      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, props.style]}
    />
  );
}

export function EmptyState({ title, message, icon = 'file-tray-outline' }: { title: string; message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={34} color={theme.muted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action ? <Text style={[styles.sectionAction, { color: theme.primary }]}>{action}</Text> : null}
    </View>
  );
}

export function StatPill({ icon, label, value, tone = 'primary' }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'blue' }) {
  const { theme } = useTheme();
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : tone === 'blue' ? theme.blue : theme.primary;
  return (
    <View style={[styles.statPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={[styles.ringOuter, { borderColor: theme.primarySoft }]}>
      <View style={[styles.ringInner, { borderColor: theme.primary, transform: [{ rotate: `${safeValue * 1.8}deg` }] }]} />
      <View style={[styles.ringCenter, { backgroundColor: theme.surface }]}>
        <Text style={[styles.ringValue, { color: theme.text }]}>{safeValue}%</Text>
        <Text style={[styles.ringLabel, { color: theme.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

export function SkeletonLine({ width = '100%' }: { width?: `${number}%` | number }) {
  const { theme } = useTheme();
  return <Animated.View style={[styles.skeleton, { width, backgroundColor: theme.surfaceAlt }]} />;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.mode === 'dark' ? '#3B1116' : '#FEF2F2', borderColor: theme.danger }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={theme.danger} />
      <Text style={[styles.bannerText, { color: theme.danger }]}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={[styles.retryText, { color: theme.danger }]}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function cardColors(theme: AppTheme) {
  return {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    shadowColor: theme.shadow,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingTop: 24 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    minHeight: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  buttonText: { fontWeight: '700', fontSize: 15 },
  buttonIcon: { marginRight: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  emptyMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionAction: { fontSize: 13, fontWeight: '900' },
  statPill: { width: '48%', borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  ringOuter: { width: 118, height: 118, borderRadius: 59, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  ringInner: { position: 'absolute', width: 118, height: 118, borderRadius: 59, borderTopWidth: 10, borderRightWidth: 10, borderBottomWidth: 10, borderLeftWidth: 10, opacity: 0.75 },
  ringCenter: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 24, fontWeight: '900' },
  ringLabel: { fontSize: 11, fontWeight: '800' },
  skeleton: { height: 14, borderRadius: 7, marginBottom: 10 },
  banner: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bannerText: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '800' },
  retryText: { fontSize: 13, fontWeight: '900' },
});
