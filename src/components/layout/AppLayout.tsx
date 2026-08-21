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
      '/dashboard': { title: 'Dashboard', subtitle: 'Operations overview and threat intelligence' },
      '/transactions': { title: 'Transactions', subtitle: 'Monitor and analyze transaction activity' },
      '/alerts': { title: 'Alerts', subtitle: 'Real-time fraud detection and alert queue' },
      '/investigation': { title: 'Cases', subtitle: 'Investigation workspace and case management' },
      '/flow': { title: 'Money Flow', subtitle: 'Transaction network visualization and trace analysis' },
      '/recovery': { title: 'Recovery', subtitle: 'Asset recovery tracking and recommendations' },
      '/chat': { title: 'AI Copilot', subtitle: 'Forensic analysis and investigative reasoning' },
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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-35 lg:hidden transition-opacity"
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
        <div className="p-5 lg:p-6 pb-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-6 right-6 z-40 lg:hidden bg-white shadow-elevated rounded-full p-3 border border-gray-200"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="material-symbols-outlined text-[24px] text-gray-700">
            {sidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}
    </div>
  );
};

export default AppLayout;