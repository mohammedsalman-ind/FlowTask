import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../components/ui';
import { TaskCard } from '../components/TaskCard';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function taskDateKey(value: string | null) {
  if (!value) return '';
  return dateKey(new Date(value));
}

function buildMonthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function CalendarScreen({ navigation }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(28);
  const { tasks, loadTasks } = useTasks();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const anchor = useMemo(() => new Date(selectedDate), [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
    }, [loadTasks])
  );

  const days = useMemo(() => buildMonthDays(anchor), [anchor]);
  const taskDates = useMemo(() => new Set(tasks.map((task) => taskDateKey(task.due_date)).filter(Boolean)), [tasks]);
  const selectedTasks = useMemo(() => tasks.filter((task) => taskDateKey(task.due_date) === selectedDate), [selectedDate, tasks]);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[styles.content, { paddingBottom }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Quick add task" onPress={() => navigation.navigate('AddTask')} style={[styles.addButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.calendar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={[styles.weekday, { color: theme.muted }]}>{day}</Text>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const selected = key === selectedDate;
          const inMonth = day.getMonth() === anchor.getMonth();
          const hasTask = taskDates.has(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedDate(key)}
              style={[styles.dayCell, { backgroundColor: selected ? theme.primary : 'transparent' }]}
            >
              <Text style={[styles.dayText, { color: selected ? '#FFFFFF' : inMonth ? theme.text : theme.muted, opacity: inMonth ? 1 : 0.45 }]}>
                {day.getDate()}
              </Text>
              {hasTask ? <View style={[styles.dot, { backgroundColor: selected ? '#FFFFFF' : theme.primary }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      </Text>
      {selectedTasks.length ? (
        selectedTasks.map((task) => <TaskCard key={task.id} task={task} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} />)
      ) : (
        <EmptyState title="No tasks on this date" message="Tasks with due dates will appear on the calendar." icon="calendar-outline" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 15, fontWeight: '700' },
  addButton: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: -2 },
  calendar: { borderWidth: 1, borderRadius: 8, padding: 10, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  weekday: { width: '14.285%', textAlign: 'center', fontSize: 11, fontWeight: '900', paddingVertical: 8 },
  dayCell: { width: '14.285%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 12 },
});
