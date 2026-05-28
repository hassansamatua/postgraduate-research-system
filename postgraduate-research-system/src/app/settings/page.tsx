'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, GraduationCap, Briefcase, Save } from 'lucide-react';
import { getCookie, decodeToken } from '@/lib/utils';
import DashboardLayout from '@/components/dashboard-layout';

function SettingsContent() {
  const [user, setUser] = useState<any>(null);
  const [supervisorData, setSupervisorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    specialization: '',
    maxStudents: 5,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = getCookie('token');
    const payload = decodeToken(token || '');
    if (!payload) {
      window.location.href = '/login';
      return;
    }
    setUser(payload);
    if (payload.role === 'supervisor') {
      fetchSupervisorData(payload.userId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSupervisorData = async (userId: number) => {
    try {
      const res = await fetch(`/api/supervisors?user_id=${userId}`);
      const data = await res.json();
      if (data.supervisors && data.supervisors.length > 0) {
        setSupervisorData(data.supervisors[0]);
        setFormData({
          specialization: data.supervisors[0].specialization || '',
          maxStudents: data.supervisors[0].max_students || 5,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (user.role === 'supervisor' && supervisorData) {
        const res = await fetch(`/api/supervisors/${supervisorData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specialization: formData.specialization,
            maxStudents: formData.maxStudents,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update settings');
          setSaving(false);
          return;
        }

        setSuccess('Settings updated successfully');
        await fetchSupervisorData(user.userId);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isSupervisor = user?.role === 'supervisor';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-green-700" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {!isSupervisor ? (
          <div className="text-center py-12">
            <p className="text-gray-500">For profile changes (name, password), please visit the <a href="/profile" className="text-green-700 hover:underline">Profile page</a>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Area of Expertise */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Area of Expertise</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Artificial Intelligence, Structural Engineering"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Your area of research expertise</p>
              </div>
            </div>

            {/* Supervision Capacity */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Supervision Capacity</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Students</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Maximum number of students you can supervise at once</p>
              </div>
            </div>

            {/* Supervisor Type Info */}
            {supervisorData && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Supervisor Type:</strong> {supervisorData.supervisor_type === 'main' ? 'Main Supervisor' : 'Co-Supervisor'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Current Students:</strong> {supervisorData.current_students} / {supervisorData.max_students}
                </p>
                {supervisorData.supervisor_type === 'co' && (
                  <p className="text-xs text-orange-600 mt-2">
                    Note: As a co-supervisor, you can provide feedback but cannot approve or reject documents.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState({ name: '', role: '', userId: 0 });
  
  useEffect(() => {
    const token = getCookie('token');
    const payload = decodeToken(token || '');
    if (payload) {
      setUser({ name: payload.name, role: payload.role, userId: payload.userId });
    }
  }, []);

  return (
    <DashboardLayout role={user.role} userName={user.name}>
      <SettingsContent />
    </DashboardLayout>
  );
}
