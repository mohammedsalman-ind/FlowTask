import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Field } from '../components/ui';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { TaskPriority, TaskStatus } from '../types';

const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const statuses: { label: string; value: TaskStatus }[] = [
  { label: 'pending', value: 'todo' },
  { label: 'completed', value: 'done' },
];

function parseDueDate(value: string) {
  if (!value.trim()) return null;
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Use a due date like 2026-07-15 or July 15, 2026.');
  }
  return parsed.toISOString();
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AddTaskScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(32);
  const { tasks, createTask, updateTask } = useTasks();
  const editingTask = tasks.find((task) => task.id === route?.params?.taskId);
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [dueDate, setDueDate] = useState(editingTask?.due_date ? editingTask.due_date.slice(0, 10) : '');
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(editingTask?.status || 'todo');
  const [tags, setTags] = useState(editingTask?.tags.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        due_date: parseDueDate(dueDate),
        priority,
        status,
        tags: parseTags(tags),
      };
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        Alert.alert('Task updated', 'Your changes were saved.');
        navigation.goBack();
      } else {
        await createTask(payload);
        Alert.alert('Task saved', 'Your task was added to FlowTask.');
        navigation.navigate('MainTabs', { screen: 'Tasks' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{editingTask ? 'Edit Task' : 'Add Task'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Field value={title} onChangeText={setTitle} placeholder="Title" />
        <Field value={description} onChangeText={setDescription} placeholder="Description" multiline style={styles.textArea} textAlignVertical="top" />
        <Field value={dueDate} onChangeText={setDueDate} placeholder="Due date, e.g. 2026-07-15" />
        <Field value={tags} onChangeText={setTags} placeholder="Tags, comma separated" />

        <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
        <View style={styles.segmentRow}>
          {priorities.map((item) => {
            const active = priority === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setPriority(item)}
                style={[styles.segment, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}
              >
                <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : theme.text }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Status</Text>
        <View style={styles.segmentRow}>
          {statuses.map((item) => {
            const active = status === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setStatus(item.value)}
                style={[styles.segment, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}
              >
                <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : theme.text }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <AppButton label={editingTask ? 'Save changes' : 'Save task'} icon="save-outline" onPress={handleSave} loading={saving} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 28, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900' },
  headerSpacer: { width: 42 },
  textArea: { minHeight: 92 },
  label: { fontSize: 14, fontWeight: '900', marginTop: 6, marginBottom: 10 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  error: { fontSize: 13, fontWeight: '700', marginVertical: 10 },
});
