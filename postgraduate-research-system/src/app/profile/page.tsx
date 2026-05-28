'use client';

import { useState, useEffect } from 'react';
import { User, Lock, X, Save, Camera, GraduationCap } from 'lucide-react';
import { getCookie, decodeToken } from '@/lib/utils';
import DashboardLayout from '@/components/dashboard-layout';

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'password' | null>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    specialization: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = getCookie('token');
    const payload = decodeToken(token || '');
    if (!payload) {
      window.location.href = '/login';
      return;
    }
    fetchUserData(payload.userId);
  }, []);

  const fetchUserData = async (userId: number) => {
    try {
      const [userRes, supRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/supervisors?user_id=${userId}`),
      ]);
      const userData = await userRes.json();
      const supData = await supRes.json();
      
      if (userData.user) {
        setUser(userData.user);
        setProfileForm({ 
          name: userData.user.name,
          specialization: '',
        });
        if (userData.user.profile_picture) {
          setPreviewUrl(userData.user.profile_picture);
        }
      }
      
      if (supData.supervisors && supData.supervisors.length > 0) {
        setProfileForm(prev => ({ 
          ...prev, 
          specialization: supData.supervisors[0].specialization || '' 
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let profilePictureUrl = previewUrl;

      // Upload profile picture if a new one is selected
      if (profilePicture) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', profilePicture);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || 'Failed to upload profile picture');
          setSaving(false);
          return;
        }
        
        profilePictureUrl = uploadData.url;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: profileForm.name,
          profilePicture: profilePictureUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        setSaving(false);
        return;
      }

      // Update supervisor specialization if applicable
      if (user.role === 'supervisor' && profileForm.specialization) {
        const supRes = await fetch(`/api/supervisors?user_id=${user.id}`);
        const supData = await supRes.json();
        if (supData.supervisors && supData.supervisors.length > 0) {
          await fetch(`/api/supervisors/${supData.supervisors[0].id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ specialization: profileForm.specialization }),
          });
        }
      }

      setSuccess('Profile updated successfully');
      setActiveModal(null);
      setProfilePicture(null);
      await fetchUserData(user.id);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        setSaving(false);
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update password');
        setSaving(false);
        return;
      }

      setSuccess('Password updated successfully');
      setActiveModal(null);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
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

  const isStudent = user?.role === 'student';
  const isSupervisor = user?.role === 'supervisor';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="w-8 h-8 text-green-700" />
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
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

        {/* Profile Info Display */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-700 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{user?.name}</h3>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveModal('profile'); setError(''); setSuccess(''); }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors"
          >
            <User className="w-4 h-4" />
            Change Profile
          </button>
          <button
            onClick={() => { setActiveModal('password'); setError(''); setSuccess(''); }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </div>

      {/* Profile Change Modal */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Change Profile</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-100">
                    <Camera className="w-3 h-3 text-gray-600" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Profile Picture</p>
                  <p className="text-xs text-gray-500">JPG, PNG or GIF</p>
                </div>
              </div>

              {/* Name - only for non-students */}
              {!isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                    required
                  />
                </div>
              )}

              {/* Area of Expertise - only for supervisors */}
              {isSupervisor && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-gray-600" />
                    <label className="block text-sm font-medium text-gray-700">Area of Expertise</label>
                  </div>
                  <input
                    type="text"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                    placeholder="e.g., Artificial Intelligence, Structural Engineering"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                    required
                  />
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
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
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
      <ProfileContent />
    </DashboardLayout>
  );
}
