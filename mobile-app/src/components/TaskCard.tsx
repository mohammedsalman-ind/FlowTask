import React, { memo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Card } from './ui';
import { useTheme } from '../context/ThemeContext';
import { Task } from '../types';

function formatDate(value: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TaskCardComponent({
  task,
  onToggle,
  onDelete,
  onDuplicate,
  onArchive,
  onPress,
  onLongPress,
}: {
  task: Task;
  onToggle?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { theme } = useTheme();
  const done = task.status === 'done';
  const priorityColor = task.priority === 'high' ? theme.danger : task.priority === 'medium' ? theme.warning : theme.success;

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const renderLeftActions = () => (
    <TouchableOpacity onPress={onToggle} style={[styles.swipeAction, { backgroundColor: theme.success }]}>
      <Ionicons name="checkmark-done-outline" size={22} color="#FFFFFF" />
      <Text style={styles.swipeText}>{done ? 'Pending' : 'Done'}</Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      {onArchive ? (
        <TouchableOpacity onPress={onArchive} style={[styles.swipeAction, { backgroundColor: theme.warning }]}>
          <Ionicons name="archive-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={confirmDelete} style={[styles.swipeAction, { backgroundColor: theme.danger }]}>
        <Ionicons name="trash-outline" size={21} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const card = (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onToggle} disabled={!onToggle} style={styles.checkButton}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? theme.success : theme.muted} />
          </TouchableOpacity>
          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.text, textDecorationLine: done ? 'line-through' : 'none' }]} numberOfLines={2}>
              {task.title}
            </Text>
            {task.description ? <Text style={[styles.description, { color: theme.muted }]} numberOfLines={2}>{task.description}</Text> : null}
          </View>
          {onDuplicate ? (
            <TouchableOpacity onPress={onDuplicate} onLongPress={onLongPress} style={styles.deleteButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
            <Ionicons name="calendar-outline" size={13} color={theme.muted} />
            <Text style={[styles.pillText, { color: theme.muted }]}>{formatDate(task.due_date)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.pillText, { color: theme.text }]}>{task.priority}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: done ? theme.primarySoft : theme.surfaceAlt }]}>
            <Text style={[styles.pillText, { color: done ? theme.primary : theme.muted }]}>{done ? 'completed' : 'pending'}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (!onToggle && !onDelete && !onArchive) return card;

  return (
    <Swipeable renderLeftActions={renderLeftActions} renderRightActions={renderRightActions} overshootLeft={false} overshootRight={false}>
      {card}
    </Swipeable>
  );
}

export const TaskCard = memo(TaskCardComponent);

const styles = StyleSheet.create({
  card: { padding: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  checkButton: { paddingRight: 10, paddingTop: 1 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  description: { fontSize: 13, marginTop: 5, lineHeight: 18 },
  deleteButton: { paddingLeft: 10, paddingVertical: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: '700', marginLeft: 5, textTransform: 'capitalize' },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  swipeAction: { minWidth: 78, marginBottom: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  swipeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginTop: 4 },
  rightActions: { flexDirection: 'row' },
});
