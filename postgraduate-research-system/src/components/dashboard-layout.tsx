'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/sidebar';
import Navbar from '@/components/ui/navbar';
import { getCookie, decodeToken } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
  userName: string;
}

export default function DashboardLayout({ children, role, userName }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ name: userName, role, profilePicture: '' });

  useEffect(() => {
    const token = getCookie('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const payload = decodeToken(token);
    if (!payload) {
      router.push('/login');
      return;
    }

    // Fetch user data including profile picture
    fetch(`/api/users/${payload.userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser({
            name: data.user.name,
            role: data.user.role,
            profilePicture: data.user.profile_picture || '',
          });
        }
      })
      .catch(err => console.error('Error fetching user data:', err));
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar - fixed width column */}
      <div className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 overflow-y-auto">
        <Suspense fallback={<div className="p-4 text-gray-400">Loading...</div>}>
          <Sidebar role={role} onClose={() => setSidebarOpen(false)} />
        </Suspense>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-10">
            <Suspense fallback={<div className="p-4 text-gray-400">Loading...</div>}>
              <Sidebar role={role} onClose={() => setSidebarOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Main content - takes remaining width */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          userName={user.name}
          profilePicture={user.profilePicture}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showMenuButton={true}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
