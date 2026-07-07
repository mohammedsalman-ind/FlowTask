import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorBanner, Field } from '../components/ui';
import { TaskCard } from '../components/TaskCard';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { Task, TaskFilter, TaskSort } from '../types';

const filters: { label: string; value: TaskFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Done', value: 'completed' },
  { label: 'High', value: 'high' },
];

const sorts: { label: string; value: TaskSort }[] = [
  { label: 'Due', value: 'due_asc' },
  { label: 'Newest', value: 'created_desc' },
  { label: 'Priority', value: 'priority' },
];

function priorityRank(task: Task) {
  return task.priority === 'high' ? 0 : task.priority === 'medium' ? 1 : 2;
}

function applyFilter(task: Task, filter: TaskFilter) {
  if (filter === 'pending') return task.status !== 'done';
  if (filter === 'completed') return task.status === 'done';
  if (filter === 'high') return task.priority === 'high';
  return true;
}

export default function TasksScreen({ navigation }: any) {
  const { theme } = useTheme();
  const listPaddingBottom = useSafeBottomPadding(18);
  const { tasks, loading, refreshing, error, loadTasks, refreshTasks, toggleTask, removeTask, duplicateTask, archiveTask } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('due_asc');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
    }, [loadTasks])
  );

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => applyFilter(task, filter))
      .filter((task) => {
        if (!normalized) return true;
        return `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityRank(a) - priorityRank(b);
        if (sort === 'created_desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return sort === 'due_desc' ? bDate - aDate : aDate - bDate;
      });
  }, [filter, query, sort, tasks]);

  const runTaskAction = useCallback(async (taskId: string, action: () => Promise<unknown>) => {
    setBusyId(taskId);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  }, []);

  const openMenu = (task: Task) => {
    Alert.alert(task.title, 'Choose an action', [
      { text: task.status === 'done' ? 'Mark pending' : 'Mark complete', onPress: () => runTaskAction(task.id, () => toggleTask(task)) },
      { text: 'Duplicate', onPress: () => runTaskAction(task.id, () => duplicateTask(task)) },
      { text: 'Archive', onPress: () => runTaskAction(task.id, () => archiveTask(task)) },
      { text: 'Delete', style: 'destructive', onPress: () => runTaskAction(task.id, () => removeTask(task.id)) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{visibleTasks.length} visible</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Add task" style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('AddTask')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Field value={query} onChangeText={setQuery} placeholder="Search tasks, notes, tags" style={styles.search} />

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.filterButton, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}
            >
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.text }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sortRow}>
        {sorts.map((item) => {
          const active = sort === item.value;
          return (
            <TouchableOpacity key={item.value} onPress={() => setSort(item.value)} style={styles.sortButton}>
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={16} color={active ? theme.primary : theme.muted} />
              <Text style={[styles.sortText, { color: active ? theme.primary : theme.muted }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => refreshTasks('all')} /> : null}
      {loading && !tasks.length ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              onLongPress={() => openMenu(item)}
              onToggle={busyId === item.id ? undefined : () => runTaskAction(item.id, () => toggleTask(item))}
              onDelete={busyId === item.id ? undefined : () => runTaskAction(item.id, () => removeTask(item.id))}
              onDuplicate={busyId === item.id ? undefined : () => openMenu(item)}
              onArchive={busyId === item.id ? undefined : () => runTaskAction(item.id, () => archiveTask(item))}
            />
          )}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshing={refreshing}
          onRefresh={() => refreshTasks('all')}
          contentContainerStyle={visibleTasks.length ? [styles.list, { paddingBottom: listPaddingBottom }] : [styles.emptyList, { paddingBottom: listPaddingBottom }]}
          ListEmptyComponent={<EmptyState title="No matching tasks" message="Try a different search or create your next task." icon="checkbox-outline" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: 4, fontWeight: '700' },
  addButton: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  search: { marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: '800' },
  sortRow: { flexDirection: 'row', gap: 16, marginBottom: 12, alignItems: 'center' },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortText: { fontSize: 12, fontWeight: '900', marginLeft: 5 },
  loader: { marginTop: 40 },
  list: { paddingBottom: 18 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
