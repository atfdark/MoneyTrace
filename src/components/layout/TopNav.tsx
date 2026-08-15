import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../hooks/useTransactions';

interface TopNavProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick, title = 'Dashboard', subtitle }) => {
  const { user } = useAuth();
  const { mutate: searchTransactions } = useSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
      // This would call the search API - for now just show placeholder
      // In real implementation, this would use the searchTransactions mutation
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
      // Navigate to transactions with search query
      window.location.href = `/transactions?search=${encodeURIComponent(searchQuery.trim())}`;
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleNotificationClick = () => {
    // Navigate to alerts page
    window.location.href = '/alerts';
  };

  const handleProfileClick = () => {
    // Navigate to profile/settings
    window.location.href = '/settings';
  };

  return (
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
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
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
            placeholder="Search transactions, addresses, alerts..."
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

        {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
          <div
            ref={searchResultsRef}
            className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-in slide-in-from-top-2 p-4 text-center"
          >
            <span className="material-symbols-outlined text-outline-variant text-[32px] mb-2 block">search_off</span>
            <p className="font-body-sm text-on-surface-variant">No results for "{searchQuery}"</p>
            <button
              type="submit"
              className="mt-2 text-secondary hover:text-secondary-container font-medium"
            >
              Search all transactions
            </button>
          </div>
        )}
      </div>

      {/* Right Section - Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          onClick={handleNotificationClick}
          className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined text-[24px]">dark_mode</span>
        </button>

        {/* User Menu */}
        <div className="relative ml-2">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary text-[18px]">person</span>
            </div>
            <div className="hidden lg:block text-left">
              <p className="font-body-sm text-body-sm text-on-surface truncate max-w-[120px]">{user?.full_name || 'User'}</p>
              <p className="font-body-xs text-body-xs text-on-surface-variant">{user?.role || 'Analyst'}</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant lg:hidden text-[20px]">expand_more</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;