import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, EmptyState, ErrorBanner, ProgressRing, SectionHeader, SkeletonLine, StatPill } from '../components/ui';
import { TaskCard } from '../components/TaskCard';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { Task } from '../types';
import { fetchRecentMeetings } from '../services/meetingService';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function dateKey(value: Date | string | null) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toDateString();
}

function isToday(value: string | null) {
  return dateKey(value) === dateKey(new Date());
}

function isOverdue(task: Task) {
  return Boolean(task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done');
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(30);
  const { tasks, loading, refreshing, error, loadTasks, refreshTasks } = useTasks();
  const [meetingCount, setMeetingCount] = useState(0);
  const [meetingError, setMeetingError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
      let active = true;
      fetchRecentMeetings(10)
        .then((meetings) => {
          if (active) {
            const todayCount = meetings.filter((meeting) => isToday(meeting.created_at)).length;
            setMeetingCount(todayCount);
            setMeetingError('');
          }
        })
        .catch((err) => {
          if (active) setMeetingError(err instanceof Error ? err.message : 'Unable to load meetings.');
        });
      return () => {
        active = false;
      };
    }, [loadTasks])
  );

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'done').length;
    const pending = tasks.length - completed;
    const today = tasks.filter((task) => isToday(task.due_date));
    const completedToday = tasks.filter((task) => task.status === 'done' && isToday(task.updated_at || null)).length;
    const overdue = tasks.filter(isOverdue);
    const upcoming = tasks
      .filter((task) => task.due_date && new Date(task.due_date) >= new Date() && task.status !== 'done')
      .slice(0, 4);
    const recent = [...tasks]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 3);
    const score = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, pending, today, completedToday, overdue, upcoming, recent, score };
  }, [tasks]);

  const actions = [
    { label: 'Add Task', icon: 'add-circle-outline', onPress: () => navigation.navigate('AddTask') },
    { label: 'Tasks', icon: 'list-outline', onPress: () => navigation.navigate('Tasks') },
    { label: 'Calendar', icon: 'calendar-outline', onPress: () => navigation.navigate('Calendar') },
    { label: 'Meeting AI', icon: 'sparkles-outline', onPress: () => navigation.navigate('Meetings') },
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshTasks('all')} tintColor={theme.primary} />}
    >
      <Text style={[styles.date, { color: theme.muted }]}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>
      <Text style={[styles.greeting, { color: theme.text }]}>{greeting()}, {user?.email?.split('@')[0] || 'there'}</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Plan clearly. Finish calmly.</Text>

      {error ? <ErrorBanner message={error} onRetry={() => refreshTasks('all')} /> : null}
      {meetingError ? <ErrorBanner message={meetingError} onRetry={() => fetchRecentMeetings(10).then((meetings) => setMeetingCount(meetings.filter((meeting) => isToday(meeting.created_at)).length)).catch((err) => setMeetingError(err instanceof Error ? err.message : 'Unable to load meetings.'))} /> : null}

      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <Text style={[styles.heroLabel, { color: theme.primary }]}>Productivity score</Text>
            <Text style={[styles.heroTitle, { color: theme.text }]}>{stats.score >= 70 ? 'Strong momentum' : 'Ready for focus'}</Text>
            <Text style={[styles.heroCopy, { color: theme.muted }]}>
              {stats.completedToday} completed today, {stats.pending} still open.
            </Text>
          </View>
          <ProgressRing value={stats.score} label="done" />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <StatPill icon="checkmark-done-outline" label="Done today" value={`${stats.completedToday}`} tone="success" />
        <StatPill icon="time-outline" label="Pending" value={`${stats.pending}`} tone="warning" />
        <StatPill icon="alert-circle-outline" label="Overdue" value={`${stats.overdue.length}`} tone="danger" />
        <StatPill icon="people-outline" label="Meetings" value={`${meetingCount}`} tone="blue" />
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity key={action.label} activeOpacity={0.8} onPress={action.onPress} style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name={action.icon} size={22} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Today" />
      {loading && !tasks.length ? (
        <Card>
          <SkeletonLine width="80%" />
          <SkeletonLine width="55%" />
        </Card>
      ) : stats.today.length ? (
        stats.today.map((task) => <TaskCard key={task.id} task={task} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} />)
      ) : (
        <EmptyState title="A clean slate today" message="Add a due date or turn meeting action items into tasks." icon="sunny-outline" />
      )}

      <SectionHeader title="Upcoming deadlines" />
      {stats.upcoming.length ? (
        stats.upcoming.map((task) => <TaskCard key={task.id} task={task} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} />)
      ) : (
        <EmptyState title="No deadlines ahead" message="Future work will appear here as soon as you schedule it." icon="calendar-clear-outline" />
      )}

      <SectionHeader title="Recent activity" />
      {stats.recent.length ? (
        stats.recent.map((task) => (
          <TouchableOpacity key={task.id} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} style={[styles.activityRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name={task.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={task.status === 'done' ? theme.success : theme.muted} />
            <Text style={[styles.activityText, { color: theme.text }]} numberOfLines={1}>{task.title}</Text>
            <Text style={[styles.activityMeta, { color: theme.muted }]}>{task.status === 'done' ? 'Done' : 'Open'}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <EmptyState title="No activity yet" message="Create your first task and FlowTask will track your rhythm." icon="pulse-outline" />
      )}

      <Card style={styles.motivationCard}>
        <Ionicons name="flash-outline" size={22} color={theme.primary} />
        <Text style={[styles.motivationText, { color: theme.text }]}>Pick one high-value task, finish it, then let the list breathe.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 32, paddingBottom: 30 },
  date: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  greeting: { fontSize: 29, fontWeight: '900', lineHeight: 35 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 16, fontWeight: '700' },
  heroCard: { padding: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroText: { flex: 1, paddingRight: 14 },
  heroLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  heroCopy: { fontSize: 14, lineHeight: 20, marginTop: 8, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  actionButton: { width: '48%', minHeight: 78, borderWidth: 1, borderRadius: 8, padding: 13, justifyContent: 'space-between' },
  actionText: { fontSize: 14, fontWeight: '900' },
  activityRow: { borderWidth: 1, borderRadius: 8, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  activityText: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '900' },
  activityMeta: { fontSize: 12, fontWeight: '900' },
  motivationCard: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  motivationText: { flex: 1, marginLeft: 10, fontSize: 14, lineHeight: 20, fontWeight: '800' },
});
