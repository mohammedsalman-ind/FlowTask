import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { AppButton, Card, EmptyState, Field } from '../components/ui';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { analyzeMeeting, saveMeetingSummary } from '../services/meetingService';
import { MeetingActionItem, MeetingSummary, TaskPriority } from '../types';

function normalizePriority(priority?: string): TaskPriority {
  return priority === 'high' || priority === 'low' || priority === 'medium' ? priority : 'medium';
}

function dueToIso(due?: string | null) {
  if (!due) return null;
  const parsed = new Date(due);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function MeetingAssistantScreen() {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(34);
  const { createTask } = useTasks();
  const [notes, setNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const remainingItems = useMemo(() => result?.action_items.filter((item) => !item.added) || [], [result]);
  const participants = useMemo(() => {
    const match = notes.match(/participants?:\s*(.+)/i);
    return match?.[1]?.split(',').map((name) => name.trim()).filter(Boolean) || [];
  }, [notes]);

  const handleAnalyze = async () => {
    if (!notes.trim()) {
      setError('Paste meeting notes or a transcript first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const summary = await analyzeMeeting(notes.trim(), meetingTitle);
      setResult(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI service failed. Check the FastAPI service and try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAdded = (index: number) => {
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        action_items: current.action_items.map((item, itemIndex) => (itemIndex === index ? { ...item, added: true } : item)),
      };
    });
  };

  const addActionItem = async (item: MeetingActionItem, index: number, showSuccess = true) => {
    setSavingIndex(index);
    try {
      await createTask({
        title: item.task,
        description: item.assignee && item.assignee !== 'Unassigned' ? `Assigned to ${item.assignee}` : 'Created from AI meeting assistant.',
        due_date: dueToIso(item.due),
        priority: normalizePriority(item.priority),
        status: 'todo',
        tags: ['meeting', 'ai-action'],
      });
      markAdded(index);
      if (showSuccess) Alert.alert('Task added', 'The action item was added to your task list.');
      return true;
    } catch (err) {
      Alert.alert('Could not add task', err instanceof Error ? err.message : 'Please try again.');
      return false;
    } finally {
      setSavingIndex(null);
    }
  };

  const addAll = async () => {
    if (!result) return;
    setSavingAll(true);
    let createdCount = 0;
    try {
      for (let index = 0; index < result.action_items.length; index += 1) {
        const item = result.action_items[index];
        if (!item.added) {
          const created = await addActionItem(item, index, false);
          if (created) createdCount += 1;
        }
      }
      Alert.alert('Tasks added', `${createdCount} action item${createdCount === 1 ? '' : 's'} added to your task list.`);
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveMeeting = async () => {
    if (!result) return;
    setSavingMeeting(true);
    try {
      await saveMeetingSummary(meetingTitle || 'Untitled meeting', notes, result);
      Alert.alert('Meeting saved', 'The summary was saved to Supabase.');
    } catch (err) {
      Alert.alert('Could not save meeting', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingMeeting(false);
    }
  };

  const resultText = result
    ? `${meetingTitle || 'Meeting'}\n${new Date().toLocaleString()}\n\nSummary\n${result.summary}\n\nAction items\n${result.action_items.map((item) => `- ${item.task}`).join('\n')}`
    : '';

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[styles.content, { paddingBottom }]}>
      <Text style={[styles.title, { color: theme.text }]}>Meeting Assistant</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Generate summaries and convert action items into real tasks.</Text>

      <Field value={meetingTitle} onChangeText={setMeetingTitle} placeholder="Meeting title" />
      <Field value={notes} onChangeText={setNotes} placeholder="Paste meeting notes or transcript..." multiline style={styles.textArea} textAlignVertical="top" />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <AppButton label="Generate summary" icon="sparkles-outline" onPress={handleAnalyze} loading={loading} disabled={loading} />

      {loading ? (
        <Card style={styles.loadingCard}>
          <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
          <View style={styles.loadingTextGroup}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Analyzing meeting</Text>
            <Text style={[styles.bodyText, { color: theme.muted }]}>Generating summary, key notes, and action items...</Text>
          </View>
        </Card>
      ) : null}

      {result ? (
        <View style={styles.result}>
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{meetingTitle || 'Untitled meeting'}</Text>
            <Text style={[styles.bodyText, { color: theme.muted }]}>{new Date().toLocaleString()}</Text>
            <Text style={[styles.bodyText, { color: theme.muted }]}>
              {participants.length ? `Participants: ${participants.join(', ')}` : 'Participants not detected'}
            </Text>
            <View style={styles.outputActions}>
              <TouchableOpacity onPress={() => Clipboard.setStringAsync(resultText)} style={[styles.outputButton, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="copy-outline" size={16} color={theme.text} />
                <Text style={[styles.outputButtonText, { color: theme.text }]}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Share.share({ message: resultText })} style={[styles.outputButton, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="share-outline" size={16} color={theme.text} />
                <Text style={[styles.outputButtonText, { color: theme.text }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingMeeting} onPress={handleSaveMeeting} style={[styles.outputButton, { backgroundColor: theme.surfaceAlt, opacity: savingMeeting ? 0.6 : 1 }]}>
                <Ionicons name="save-outline" size={16} color={theme.text} />
                <Text style={[styles.outputButtonText, { color: theme.text }]}>{savingMeeting ? 'Saving' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Summary</Text>
            <Text style={[styles.bodyText, { color: theme.muted }]}>{result.summary || 'No summary returned.'}</Text>
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Key points</Text>
            {result.key_notes.length ? (
              result.key_notes.map((note, index) => (
                <View key={`${note.point}-${index}`} style={styles.pointRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
                  <Text style={[styles.pointText, { color: theme.text }]}>{note.point}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.bodyText, { color: theme.muted }]}>No key points found.</Text>
            )}
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Risks</Text>
            {result.risks?.length ? result.risks.map((risk, index) => (
              <Text key={`${risk}-${index}`} style={[styles.bodyText, { color: theme.muted }]}>- {risk}</Text>
            )) : <Text style={[styles.bodyText, { color: theme.muted }]}>No risks detected.</Text>}
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Important deadlines</Text>
            {result.important_deadlines?.length ? result.important_deadlines.map((deadline, index) => (
              <Text key={`${deadline}-${index}`} style={[styles.bodyText, { color: theme.muted }]}>- {deadline}</Text>
            )) : <Text style={[styles.bodyText, { color: theme.muted }]}>No dated action items found.</Text>}
          </Card>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Action items</Text>
          {result.action_items.length ? (
            <>
              <AppButton label="Add all action items" icon="add-circle-outline" onPress={addAll} loading={savingAll} disabled={savingAll || !remainingItems.length} />
              {result.action_items.map((item, index) => (
                <Card key={`${item.task}-${index}`} style={styles.actionCard}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>{item.task}</Text>
                  <Text style={[styles.bodyText, { color: theme.muted }]}>
                    {item.assignee || 'Unassigned'} / {item.priority || 'medium'}{item.due ? ` / ${item.due}` : ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => addActionItem(item, index)}
                    disabled={item.added || savingIndex === index || savingAll}
                    style={[styles.inlineButton, { backgroundColor: item.added ? theme.surfaceAlt : theme.primary }]}
                  >
                    <Text style={[styles.inlineButtonText, { color: item.added ? theme.muted : '#FFFFFF' }]}>{item.added ? 'Added' : 'Add to Task'}</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </>
          ) : (
            <EmptyState title="No action items" message="The AI did not find concrete follow-ups in this transcript." icon="sparkles-outline" />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 34 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 18 },
  textArea: { minHeight: 140 },
  error: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  loadingCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  loadingTextGroup: { flex: 1 },
  result: { marginTop: 18 },
  cardTitle: { fontSize: 17, fontWeight: '900', marginBottom: 8 },
  bodyText: { fontSize: 14, lineHeight: 20 },
  outputActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  outputButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  outputButtonText: { fontSize: 12, fontWeight: '900', marginLeft: 5 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  pointText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 8, marginBottom: 12 },
  actionCard: { marginTop: 12 },
  actionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 6 },
  inlineButton: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 9 },
  inlineButtonText: { fontSize: 13, fontWeight: '900' },
});
