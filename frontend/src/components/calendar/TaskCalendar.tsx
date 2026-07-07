import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import toast from 'react-hot-toast';

import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types';
import { TaskModal } from '../tasks/TaskModal';
import { CalendarLegend } from './CalendarLegend';

// Map our Priority enum to colors for the dots
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  medium: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]',
  low: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
};

// Map Priority enum to weights to determine the "highest" priority for a day
const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface TaskCalendarProps {
  mini?: boolean;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({ mini = false }) => {
  const { tasks, isLoading, fetchTasks, updateTask } = useTaskStore();
  const calendarRef = useRef<FullCalendar>(null);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Navigate to today on mount
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  }, []);

  // Map Tasks to FullCalendar events
  const events = tasks.map(task => {
    const isCompleted = task.status === 'done';
    const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < new Date();
    
    // Determine visual styling for the event block itself
    let backgroundColor = 'var(--surface-2)';
    let borderColor = 'transparent';
    let textColor = 'var(--text-primary)';
    let classNames = ['fc-custom-event'];

    if (isCompleted) {
      backgroundColor = 'transparent';
      borderColor = 'var(--stone-300)';
      textColor = 'var(--text-muted)';
      classNames.push('line-through', 'opacity-50');
    } else if (isOverdue) {
      borderColor = 'var(--danger)';
      textColor = 'var(--danger)';
      classNames.push('border', 'border-red-500/50', 'bg-red-500/10');
    } else {
       if (task.priority === 'high') {
         borderColor = 'var(--danger)';
         classNames.push('border-l-4', 'border-l-red-500');
       } else if (task.priority === 'medium') {
         borderColor = 'var(--warning)';
         classNames.push('border-l-4', 'border-l-yellow-500');
       } else {
         borderColor = 'var(--success)';
         classNames.push('border-l-4', 'border-l-emerald-500');
       }
    }

    return {
      id: task.id,
      title: task.title,
      start: task.due_date || task.created_at, // Fallback to created_at if no due date, or maybe filter them out?
      allDay: task.due_date && task.due_date.includes('T00:00:00') ? true : false,
      backgroundColor,
      borderColor,
      textColor,
      classNames,
      extendedProps: {
        task, // keep the full task object
        isOverdue,
      }
    };
  }).filter(e => e.start); // Only show events that have a date

  // Group tasks by date string (YYYY-MM-DD) to calculate day cell dots
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.due_date && task.status !== 'done') {
      const dateStr = task.due_date.split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  // Custom Day Cell injection to add priority dots
  const injectDayCellContent = (arg: any) => {
    // This hook allows us to return JSX for the day cell's number area
    const dateStr = arg.date.toISOString().split('T')[0];
    const dayTasks = tasksByDate[dateStr] || [];

    if (dayTasks.length > 0) {
      // Find the highest priority task for the day
      const highestPriorityTask = dayTasks.reduce((prev, current) => {
        return (PRIORITY_WEIGHT[current.priority] > PRIORITY_WEIGHT[prev.priority]) ? current : prev;
      });

      const priorityColor = PRIORITY_COLORS[highestPriorityTask.priority];
      const isOverdue = highestPriorityTask.due_date && new Date(highestPriorityTask.due_date) < new Date();
      const isHighPriority = highestPriorityTask.priority === 'high';

      // Pulse red dot if overdue high priority
      const pulseClass = (isOverdue && isHighPriority) ? 'animate-pulse' : '';

      return (
        <div className="flex flex-col items-center justify-center w-full">
          <span>{arg.dayNumberText}</span>
          <div 
            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${priorityColor} ${pulseClass}`} 
            title={`Highest Priority: ${highestPriorityTask.priority}`}
          />
        </div>
      );
    }
    return <div className="flex flex-col items-center"><span>{arg.dayNumberText}</span></div>;
  };

  // Event Handlers
  const handleEventClick = (info: any) => {
    const task = info.event.extendedProps.task;
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (info: any) => {
    const taskId = info.event.id;
    const newDate = info.event.start;
    
    if (!newDate) {
      info.revert();
      return;
    }

    const isoDate = newDate.toISOString();
    
    // Optimistic update handled implicitly by not reverting immediately
    const success = await updateTask(taskId, { due_date: isoDate });
    
    if (success) {
      toast.success('Task rescheduled');
    } else {
      info.revert();
    }
  };

  return (
    <div className={`flex flex-col animate-fade-in ${mini ? '' : 'h-[calc(100vh-8rem)]'}`}>
      {!mini && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text">Calendar</h1>
              <p className="text-sm text-text-muted mt-0.5">
                Drag and drop tasks to reschedule them.
              </p>
            </div>
          </div>
          <CalendarLegend />
        </>
      )}

      <div className={`flex-1 bg-surface border border-stone-300/50 rounded-2xl overflow-hidden shadow-xl p-4 calendar-container ${mini ? 'text-xs' : ''}`}>
        {isLoading && tasks.length === 0 ? (
           <div className="w-full h-full skeleton rounded-xl"></div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={
              mini 
                ? { left: 'title', right: 'prev,next' }
                : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
            }
            events={events}
            editable={true} // enables drag and drop
            droppable={true}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            dayCellContent={injectDayCellContent}
            height={mini ? 'auto' : '100%'}
            firstDay={1} // Monday first
            eventDisplay="block"
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            // Add tooltips using eventDidMount
            eventDidMount={(info) => {
               const task: Task = info.event.extendedProps.task;
               const tooltipContent = `
${task.title}
Status: ${task.status}
Priority: ${task.priority}
Due: ${task.due_date ? new Date(task.due_date).toLocaleString() : 'No date'}
${task.description ? '\n' + task.description : ''}
               `.trim();
               info.el.setAttribute('title', tooltipContent);
            }}
          />
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        task={editingTask}
      />
    </div>
  );
};
