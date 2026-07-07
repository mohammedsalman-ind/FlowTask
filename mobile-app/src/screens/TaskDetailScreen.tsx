import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card, EmptyState } from '../components/ui';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

function formatDate(value: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TaskDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(34);
  const { tasks, toggleTask, duplicateTask, archiveTask, removeTask } = useTasks();
  const [busy, setBusy] = useState(false);
  const task = useMemo(() => tasks.find((item) => item.id === route.params?.taskId), [route.params?.taskId, tasks]);

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState title="Task not found" message="This task may have been deleted or archived." icon="search-outline" />
      </View>
    );
  }

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      if (successMessage) Alert.alert('Done', successMessage);
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete task?', 'This task will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(async () => { await removeTask(task.id); navigation.goBack(); }, 'Task deleted.') },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[styles.content, { paddingBottom }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Task</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTask', { taskId: task.id })} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="create-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Card>
        <View style={styles.detailTop}>
          <View style={[styles.priorityBar, { backgroundColor: task.priority === 'high' ? theme.danger : task.priority === 'medium' ? theme.warning : theme.success }]} />
          <View style={styles.detailBody}>
            <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>
            <Text style={[styles.description, { color: theme.muted }]}>{task.description || 'No description added.'}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <InfoRow icon="calendar-outline" label="Due" value={formatDate(task.due_date)} />
        <InfoRow icon="flag-outline" label="Priority" value={task.priority} />
        <InfoRow icon="checkmark-circle-outline" label="Status" value={task.status === 'done' ? 'completed' : 'pending'} />
        <InfoRow icon="pricetags-outline" label="Tags" value={task.tags.length ? task.tags.join(', ') : 'No tags'} />
      </Card>

      <View style={styles.buttonGrid}>
        <AppButton label={task.status === 'done' ? 'Mark pending' : 'Mark complete'} icon="checkmark-done-outline" onPress={() => run(() => toggleTask(task), task.status === 'done' ? 'Task marked pending.' : 'Task completed.')} disabled={busy} />
        <AppButton label="Duplicate" icon="copy-outline" variant="secondary" onPress={() => run(() => duplicateTask(task), 'Task duplicated.')} disabled={busy} />
        <AppButton label="Share" icon="share-outline" variant="secondary" onPress={() => Share.share({ message: `${task.title}\n${task.description}` })} disabled={busy} />
        <AppButton label="Archive" icon="archive-outline" variant="secondary" onPress={() => run(async () => { await archiveTask(task); navigation.goBack(); }, 'Task archived.')} disabled={busy} />
      </View>

      <AppButton label="Delete task" icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={busy} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={19} color={theme.primary} />
      <Text style={[styles.infoLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 20, paddingTop: 28, paddingBottom: 34 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  iconButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  detailTop: { flexDirection: 'row' },
  priorityBar: { width: 5, borderRadius: 4, marginRight: 12 },
  detailBody: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', lineHeight: 30 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { width: 72, marginLeft: 10, fontSize: 13, fontWeight: '900' },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
  buttonGrid: { gap: 10, marginBottom: 12 },
});
