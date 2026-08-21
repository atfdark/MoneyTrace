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

  const badgeCount = emergencyAlert ? 1 : toasts.length;

  return (
    <>
      <header className="fixed left-0 top-0 right-0 h-16 bg-white border-b border-gray-200 shadow-nav flex items-center justify-between px-4 lg:ml-64 lg:pl-6 lg:pr-6 z-30 transition-all duration-300">
        {/* Left Section - Menu Button & Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <div className="hidden lg:block">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
              {/* System Health Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[11px] font-semibold text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>{activeUsers.length > 0 ? `${activeUsers.length} Online` : 'Connected'}</span>
              </div>
            </div>
            {subtitle && (
              <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search transactions, accounts, alerts..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-11 pr-4 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
              aria-label="Global search"
              autoComplete="off"
            />
            {isSearching && (
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin text-[18px]">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              ref={searchResultsRef}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-elevated border border-gray-200 overflow-hidden z-50"
            >
              <div className="p-1.5">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-blue-500 text-[20px]">{result.icon}</span>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{result.title}</p>
                      <p className="text-[11px] text-gray-500">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Notifications & User */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {badgeCount > 0 && (
              <span className={`absolute top-1 right-1 w-4.5 h-4.5 min-w-[18px] text-[10px] font-bold rounded-full flex items-center justify-center ${
                emergencyAlert
                  ? 'bg-red-500 text-gray-900 animate-pulse'
                  : 'bg-red-500 text-gray-900'
              }`}>
                {badgeCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1 hidden lg:block" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              aria-label="User menu"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 text-xs font-bold">
                    {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[120px]">
                  {user?.full_name || 'Investigator'}
                </p>
                <p className="text-[11px] text-gray-500 capitalize">
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