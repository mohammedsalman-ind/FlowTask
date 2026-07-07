import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden animate-fade-in">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
