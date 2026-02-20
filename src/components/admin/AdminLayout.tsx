import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, Receipt, FileText, Settings, LogOut, Menu, X, Gift, ShoppingBag, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
interface AdminLayoutProps {
  children: ReactNode;
}
const menuItems = [{
  icon: LayoutDashboard,
  label: 'แดชบอร์ด',
  path: '/admin'
}, {
  icon: Users,
  label: 'จัดการสมาชิก',
  path: '/admin/members'
}, {
  icon: Receipt,
  label: 'อนุมัติใบเสร็จ',
  path: '/admin/receipts'
}, {
  icon: FileText,
  label: 'จัดการเนื้อหา',
  path: '/admin/content'
}, {
  icon: Gift,
  label: 'จัดการของรางวัล',
  path: '/admin/rewards'
}, {
  icon: ShoppingBag,
  label: 'รายการแลกของรางวัล',
  path: '/admin/redemptions'
}, {
  icon: Target,
  label: 'จัดการภารกิจ',
  path: '/admin/missions'
}, {
  icon: Settings,
  label: 'ตั้งค่า',
  path: '/admin/settings'
}];
export default function AdminLayout({
  children
}: AdminLayoutProps) {
  const {
    user,
    profile,
    isAdmin,
    isLoading,
    signOut
  } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <div className="min-h-screen flex w-full bg-background">
    {/* Mobile overlay */}
    {sidebarOpen && <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

    {/* Sidebar */}
    <aside className={cn("fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 bg-sidebar-background text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 shrink-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-sidebar-primary">
              Admin Panel
            </h1>
            <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Elanco Bioprotection Connex
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-slate-600 font-medium")}>
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>;
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-700">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs font-medium text-slate-500">Admin</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-sidebar-accent font-medium" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </aside>

    {/* Main content */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}


      {/* Page content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {children}
      </main>
    </div>
  </div>;
}