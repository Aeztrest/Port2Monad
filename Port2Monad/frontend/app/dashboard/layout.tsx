'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('@/components/layout/sidebar').then(mod => ({ default: mod.Sidebar })), { ssr: false });
const TopNav = dynamic(() => import('@/components/layout/top-nav').then(mod => ({ default: mod.TopNav })), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
