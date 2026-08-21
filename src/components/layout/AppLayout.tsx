import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useLiveEvents } from '../../hooks/useWebSocket';

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ title, subtitle }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Enable live WebSocket updates across investigator command center
  useLiveEvents();

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Get page-specific title and subtitle from route
  const getPageMeta = (pathname: string) => {
    const routes: Record<string, { title: string; subtitle?: string }> = {
      '/dashboard': { title: 'Dashboard', subtitle: 'Overview of financial crime intelligence' },
      '/transactions': { title: 'Transactions', subtitle: 'Monitor and analyze transaction data' },
      '/alerts': { title: 'Fraud Alerts', subtitle: 'Real-time fraud detection and alerts' },
      '/investigation': { title: 'Investigation', subtitle: 'Deep-dive case investigation tools' },
      '/flow': { title: 'Money Flow', subtitle: 'Visualize transaction networks and flows' },
      '/recovery': { title: 'Recovery Intelligence', subtitle: 'Asset recovery and tracking' },
      '/chat': { title: 'AI Assistant', subtitle: 'Intelligent financial crime analysis' },
      '/reports': { title: 'Reports', subtitle: 'Generate and export investigation reports' },
      '/settings': { title: 'Settings', subtitle: 'Configure your preferences' },
    };

    // Match nested routes
    for (const [path, meta] of Object.entries(routes)) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        return meta;
      }
    }
    return { title: 'MoneyTrace', subtitle: 'Financial Crime Intelligence Platform' };
  };

  const pageMeta = title ? { title, subtitle } : getPageMeta(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-35 lg:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="lg:ml-64 pt-16 min-h-screen transition-all duration-300">
        {/* Top Navigation */}
        <TopNav
          onMenuClick={toggleSidebar}
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
        />

        {/* Page Content */}
        <div className="p-4 lg:p-6 pb-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile sidebar toggle button (bottom right on mobile) */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-6 right-6 z-40 lg:hidden glass-panel shadow-xl rounded-full p-3"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="material-symbols-outlined text-[28px] text-on-surface">
            {sidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}
    </div>
  );
};

export default AppLayout;