import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../hooks/useTransactions';
import { useLiveTelemetry } from '../../hooks/useWebSocket';
import { EmergencyAlertDrawer } from './EmergencyAlertDrawer';

interface TopNavProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick, title = 'Dashboard', subtitle }) => {
  const { user } = useAuth();
  const { mutate: searchTransactions } = useSearch();
  const { activeUsers, toasts, emergencyAlert } = useLiveTelemetry();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
          setShowSearchResults(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/transactions?search=${encodeURIComponent(searchQuery.trim())}`;
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleProfileClick = () => {
    window.location.href = '/settings';
  };

  const badgeCount = emergencyAlert ? 1 : toasts.length > 0 ? toasts.length : 3;

  return (
    <>
      <header className="fixed left-0 top-0 right-0 h-16 glass-panel border-b border-outline-variant/20 flex items-center justify-between px-4 lg:ml-0 lg:pl-6 lg:pr-6 z-30 transition-all duration-300">
        {/* Left Section - Menu Button & Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <div className="hidden lg:block">
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
              {/* Presence Telemetry Pill */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{activeUsers.length || 17} Nodes Active</span>
              </div>
            </div>
            {subtitle && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">
              search
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search transactions, accounts (ACC1001), alerts..."
              className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-full py-2 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all font-body-sm"
              aria-label="Global search"
              autoComplete="off"
            />
            {isSearching && (
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-secondary animate-spin">
                refresh
              </span>
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              ref={searchResultsRef}
              className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-in slide-in-from-top-2"
            >
              <div className="p-2">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container-high transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-secondary">{result.icon}</span>
                    <div>
                      <p className="font-body-sm text-body-sm">{result.title}</p>
                      <p className="font-body-xs text-body-xs text-on-surface-variant">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Notifications & User */}
        <div className="flex items-center gap-2">
          {/* Emergency Alert Drawer Bell Button */}
          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className={`absolute -top-1 -right-1 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center ${
              emergencyAlert
                ? 'bg-rose-600 text-white animate-ping'
                : 'bg-rose-600 text-white'
            }`}>
              {badgeCount}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-[24px]">dark_mode</span>
          </button>

          {/* User Menu */}
          <div className="relative ml-2">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label="User menu"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-on-secondary text-[18px]">person</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070B14]" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="font-body-sm text-body-sm text-on-surface truncate max-w-[120px] font-bold">
                  {user?.full_name || 'Investigator'}
                </p>
                <p className="font-body-xs text-body-xs text-on-surface-variant uppercase text-[10px] font-mono">
                  {user?.role || 'Admin'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-over Emergency Alert Drawer */}
      <EmergencyAlertDrawer
        isOpen={alertDrawerOpen}
        onClose={() => setAlertDrawerOpen(false)}
      />
    </>
  );
};

export default TopNav;