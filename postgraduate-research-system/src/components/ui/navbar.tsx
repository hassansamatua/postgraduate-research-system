'use client';

import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  userName: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Navbar({ userName, onMenuClick, showMenuButton = false }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg relative"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-500 text-sm">No new notifications</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{backgroundColor:'#1B5E20'}}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-700 font-medium hidden sm:block">{userName}</span>
        </div>
      </div>
    </nav>
  );
}
