import { CreateTaskInput, Task, TaskFilter, TaskStatus, UpdateTaskInput } from '../types';
import { requireSupabaseConfig, supabase } from './supabase';

const taskColumns = 'id,user_id,title,description,status,priority,tags,due_date,context,recurrence,created_at,updated_at';

function normalizeTask(task: Task): Task {
  return {
    ...task,
    description: task.description || '',
    tags: task.tags || [],
    due_date: task.due_date || null,
  };
}

export async function fetchTasks(filter: TaskFilter = 'all'): Promise<Task[]> {
  requireSupabaseConfig();

  let query = supabase.from('tasks').select(taskColumns).order('due_date', { ascending: true, nullsFirst: false });

  if (filter === 'pending') query = query.neq('status', 'done');
  if (filter === 'completed') query = query.eq('status', 'done');
  if (filter === 'high') query = query.eq('priority', 'high');

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((task) => normalizeTask(task as Task)).filter((task) => !task.tags.includes('archived'));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  requireSupabaseConfig();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('You must be signed in to create tasks.');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      user_id: userId,
      description: input.description || '',
      context: 'work',
      recurrence: 'none',
    })
    .select(taskColumns)
    .single();

  if (error) throw new Error(error.message);
  return normalizeTask(data as Task);
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  requireSupabaseConfig();
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select(taskColumns)
    .single();

  if (error) throw new Error(error.message);
  return normalizeTask(data as Task);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  requireSupabaseConfig();
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('id', id)
    .select(taskColumns)
    .single();

  if (error) throw new Error(error.message);
  return normalizeTask(data as Task);
}

export async function duplicateTask(task: Task): Promise<Task> {
  return createTask({
    title: `${task.title} copy`,
    description: task.description,
    due_date: task.due_date,
    priority: task.priority,
    status: 'todo',
    tags: task.tags.filter((tag) => tag !== 'archived'),
  });
}

export async function archiveTask(task: Task): Promise<Task> {
  const tags = Array.from(new Set([...task.tags, 'archived']));
  return updateTask(task.id, { tags });
}

export async function deleteTask(id: string): Promise<void> {
  requireSupabaseConfig();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
