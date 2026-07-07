import React from 'react';
import { TaskCalendar } from '../components/calendar/TaskCalendar';

export const CalendarPage: React.FC = () => {
  return (
    <div className="h-full">
      <TaskCalendar />
    </div>
  );
};
