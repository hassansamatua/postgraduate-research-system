'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Shield,
  GraduationCap,
  ClipboardCheck,
  FileCheck,
  UserCheck,
  Activity,
  Clock
} from 'lucide-react';

interface SidebarProps {
  role: string;
  onClose?: () => void;
}

const menuItems: Record<string, Array<{ href: string; label: string; icon: any; tab?: string }>> = {
  admin: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/admin?tab=authorizations', label: 'Authorizations', icon: Shield, tab: 'authorizations' },
    { href: '/dashboard/admin?tab=students', label: 'Students', icon: Users, tab: 'students' },
    { href: '/dashboard/admin?tab=activity', label: 'Activity', icon: Activity, tab: 'activity' },
    { href: '/dashboard/admin?tab=defenses', label: 'Defenses', icon: Calendar, tab: 'defenses' },
    { href: '/dashboard/admin?tab=ext_reviews', label: 'Ext. Reviews', icon: UserCheck, tab: 'ext_reviews' },
    { href: '/dashboard/admin?tab=reports', label: 'Reports', icon: FileCheck, tab: 'reports' },
    { href: '/dashboard/admin?tab=documents', label: 'Documents', icon: FileText, tab: 'documents' },
  ],
  student: [
    { href: '/dashboard/student', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/student?tab=title_proposal', label: 'Title Proposal', icon: FileText, tab: 'title_proposal' },
    { href: '/dashboard/student?tab=admin_authorization', label: 'Admin Auth.', icon: Shield, tab: 'admin_authorization' },
    { href: '/dashboard/student?tab=proposal_stage', label: 'Proposal', icon: FileCheck, tab: 'proposal_stage' },
    { href: '/dashboard/student?tab=proposal_defense', label: 'Proposal Defense', icon: Calendar, tab: 'proposal_defense' },
    { href: '/dashboard/student?tab=chapter_4_5', label: 'Ch. 4 & 5', icon: ClipboardCheck, tab: 'chapter_4_5' },
    { href: '/dashboard/student?tab=final_report', label: 'Final Report', icon: FileCheck, tab: 'final_report' },
    { href: '/dashboard/student?tab=final_defense', label: 'Final Defense', icon: GraduationCap, tab: 'final_defense' },
    { href: '/dashboard/student?tab=external_review', label: 'Ext. Review', icon: UserCheck, tab: 'external_review' },
    { href: '/dashboard/student?tab=completion', label: 'Completion', icon: Bell, tab: 'completion' },
  ],
  faculty: [
    { href: '/dashboard/faculty', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/faculty?tab=pending', label: 'Pending Review', icon: Clock, tab: 'pending' },
    { href: '/dashboard/faculty?tab=all', label: 'All Titles', icon: FileText, tab: 'all' },
    { href: '/dashboard/faculty?tab=documents', label: 'Documents', icon: FileCheck, tab: 'documents' },
  ],
  supervisor: [
    { href: '/dashboard/supervisor', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/supervisor?tab=students', label: 'My Students', icon: Users, tab: 'students' },
    { href: '/dashboard/supervisor?tab=documents', label: 'Document Reviews', icon: FileCheck, tab: 'documents' },
    { href: '/dashboard/supervisor?tab=defenses', label: 'Defenses', icon: Calendar, tab: 'defenses' },
    { href: '/dashboard/supervisor?tab=messages', label: 'Messages', icon: MessageSquare, tab: 'messages' },
  ],
  auditor: [
    { href: '/dashboard/auditor', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/auditor?tab=research', label: 'Research Topics', icon: FileText, tab: 'research' },
    { href: '/dashboard/auditor?tab=workload', label: 'Supervisor Workload', icon: UserCheck, tab: 'workload' },
    { href: '/dashboard/auditor?tab=compliance', label: 'Compliance', icon: Shield, tab: 'compliance' },
  ],
  external_reviewer: [
    { href: '/dashboard/external-reviewer', label: 'Dashboard', icon: Home, tab: '' },
    { href: '/dashboard/external-reviewer?tab=reviews', label: 'Assigned Reviews', icon: FileCheck, tab: 'reviews' },
  ],
};

export default function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || '';
  const items = menuItems[role] || [];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="w-64 text-white min-h-screen flex flex-col" style={{backgroundColor:'#1B5E20'}}>
      <div className="p-6 border-b border-green-800">
        <h1 className="text-xl font-bold">Research System</h1>
        <p className="text-green-200 text-sm capitalize">{role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const { tab: itemTab } = item;
          const isActive = itemTab !== undefined
            ? (currentTab === itemTab && (pathname === item.href.split('?')[0]))
              || (itemTab === '' && currentTab === '' && pathname === item.href)
            : pathname === item.href;
          
          return (
            <Link
              key={item.href + (item.tab ?? '')}
              href={item.href}
              onClick={onClose}
              style={isActive ? {backgroundColor:'#FFC107', color:'#1B5E20'} : {}}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm',
                isActive 
                  ? 'font-semibold' 
                  : 'text-green-100 hover:bg-green-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-green-800 space-y-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-100 hover:bg-green-800 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
