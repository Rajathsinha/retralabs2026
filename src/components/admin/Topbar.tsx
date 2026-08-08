import { RefreshCw, Bell, SlidersHorizontal, Search, Menu } from 'lucide-react';

interface TopbarProps {
  search: string;
  onSearch: (v: string) => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onOpenMobileNav: () => void;
  loading: boolean;
  lastRefresh: Date | null;
}

export function Topbar({ search, onSearch, onRefresh, onToggleFilters, onOpenMobileNav, loading, lastRefresh }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button onClick={onOpenMobileNav} className="lg:hidden text-slate-600">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search orders, customers, tracking ID…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100/80 border border-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-300 transition-all"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {lastRefresh && (
            <span className="hidden md:block text-xs text-slate-400 mr-1">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onToggleFilters}
            className="h-9 px-3 flex items-center gap-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
