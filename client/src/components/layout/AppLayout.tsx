import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  Send,
  MessageSquare,
  Kanban,
  Users,
  Phone,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Numbers', href: '/numbers', icon: Phone, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Automation', href: '/automation', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navigation.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-dark-700/50 bg-dark-900/80 backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-700/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-scl-600 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-dark-50 truncate">SecureCreditLines</span>
              <span className="text-[10px] text-dark-500 uppercase tracking-wider">SMS Platform</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 text-dark-500 hover:text-dark-300 transition-colors"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                clsx(
                  'sidebar-link',
                  isActive && 'active',
                  collapsed && 'justify-center px-2'
                )
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-dark-700/50 p-3">
          <div
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              collapsed && 'justify-center px-0'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-scl-600/30 flex items-center justify-center text-scl-400 text-xs font-bold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-200 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-dark-500 truncate">{user?.role}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-dark-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children || <Outlet />}
      </main>
    </div>
  );
}
