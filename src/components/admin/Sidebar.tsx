import { LayoutDashboard, ShoppingBag, BarChart3, Users, Settings, LogOut, X, ExternalLink, Sparkles } from 'lucide-react';
import Logo from '../Logo';

export type AdminPage = 'dashboard' | 'orders' | 'analytics' | 'customers' | 'settings';

interface SidebarProps {
  current: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAiCopilot?: () => void;
}

const NAV: { id: AdminPage; label: string; icon: React.ComponentType<{ className?: string }>; badge?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  current,
  onNavigate,
  onLogout,
  mobileOpen,
  onCloseMobile,
  onOpenAiCopilot,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1220] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06]">
          <a href="/" className="hover:opacity-90 transition-opacity">
            <Logo size="md" variant="light" />
          </a>
          <button onClick={onCloseMobile} className="text-slate-400 lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = current === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  active ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#2563EB]" />}
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-bold text-amber-400">★</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Copilot Launcher */}
        {onOpenAiCopilot && (
          <div className="shrink-0 px-3 py-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onOpenAiCopilot}
              className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-[1px] font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between rounded-[11px] bg-[#0B1220]/90 px-3 py-2.5 transition-colors group-hover:bg-[#0B1220]/60">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">AI Copilot</span>
                </div>
                <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-mono text-cyan-200">⌘K</span>
              </div>
            </button>
          </div>
        )}

        {/* External Links */}
        <div className="shrink-0 px-3 py-2 mt-auto border-t border-white/[0.06]">
          <a
            href="https://app.shiprocket.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-[18px] h-[18px]" />
              <span>Shiprocket</span>
            </div>
          </a>
        </div>

        {/* Logout */}
        <div className="shrink-0 p-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.03] transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
