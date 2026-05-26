'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { Users, Building2, MapPin, Plus, Edit, Trash2, Search, Shield, CheckCircle, XCircle } from 'lucide-react';

function SuperAdminDashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'users' | 'faculties' | 'departments'>('users');
  const [user, setUser] = useState({ name: '', role: 'super_admin' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userModal, setUserModal] = useState<{ id?: number; name: string; email: string; password: string; role: string; faculty_id: string; department_id: string; status: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Faculties state
  const [faculties, setFaculties] = useState<any[]>([]);
  const [facultyModal, setFacultyModal] = useState<{ id?: number; name: string; description: string } | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentModal, setDepartmentModal] = useState<{ id?: number; faculty_id: string; name: string } | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'users' | 'faculties' | 'departments' | null;
    if (tabParam && ['users', 'faculties', 'departments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const token = getCookie('token');
      const payload = decodeToken(token || '');
      if (payload) {
        setUser({ name: payload.name, role: payload.role });
        const [usersRes, facRes, deptRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/faculties'),
          fetch('/api/departments'),
        ]);
        const [usersData, facData, deptData] = await Promise.all([
          usersRes.json(), facRes.json(), deptRes.json(),
        ]);
        if (usersData.users) setUsers(usersData.users);
        if (facData.faculties) setFaculties(facData.faculties);
        if (deptData.departments) setDepartments(deptData.departments);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // User CRUD handlers
  const handleSaveUser = async () => {
    if (!userModal) return;
    setActionLoading(userModal.id || -1);
    try {
      const method = userModal.id ? 'PUT' : 'POST';
      const url = userModal.id ? `/api/users/${userModal.id}` : '/api/users';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userModal.name,
          email: userModal.email,
          password: userModal.password,
          role: userModal.role,
          faculty_id: userModal.faculty_id || null,
          department_id: userModal.department_id || null,
          status: userModal.status,
        }),
      });
      if (res.ok) { setUserModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } finally { setActionLoading(null); }
  };

  // Faculty CRUD handlers
  const handleSaveFaculty = async () => {
    if (!facultyModal) return;
    setActionLoading(facultyModal.id || -1);
    try {
      const method = facultyModal.id ? 'PUT' : 'POST';
      const url = facultyModal.id ? `/api/faculties/${facultyModal.id}` : '/api/faculties';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: facultyModal.name, description: facultyModal.description }),
      });
      if (res.ok) { setFacultyModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handleDeleteFaculty = async (id: number) => {
    if (!confirm('Are you sure you want to delete this faculty?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/faculties/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } finally { setActionLoading(null); }
  };

  // Department CRUD handlers
  const handleSaveDepartment = async () => {
    if (!departmentModal) return;
    setActionLoading(departmentModal.id || -1);
    try {
      const method = departmentModal.id ? 'PUT' : 'POST';
      const url = departmentModal.id ? `/api/departments/${departmentModal.id}` : '/api/departments';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faculty_id: departmentModal.faculty_id, name: departmentModal.name }),
      });
      if (res.ok) { setDepartmentModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <DashboardLayout role="super_admin" userName="">
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role="super_admin" userName={user.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
          <p className="text-sm text-gray-500">System Administration & User Management</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { id: 'users' as const, label: `Users (${users.length})` },
              { id: 'faculties' as const, label: `Faculties (${faculties.length})` },
              { id: 'departments' as const, label: `Departments (${departments.length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <button onClick={() => setUserModal({ name: '', email: '', password: '', role: 'student', faculty_id: '', department_id: '', status: 'active' })}
                  className="text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor:'#1B5E20'}}>
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Faculty</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Department</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{u.name}</td>
                        <td className="py-3 px-4 text-sm">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'faculty' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'supervisor' ? 'bg-green-100 text-green-700' :
                            u.role === 'auditor' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{u.role.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3 px-4 text-sm">{u.faculty_name || '—'}</td>
                        <td className="py-3 px-4 text-sm">{u.department_name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1 text-xs ${u.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {u.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => setUserModal({ id: u.id, name: u.name, email: u.email, password: '', role: u.role, faculty_id: String(u.faculty_id || ''), department_id: String(u.department_id || ''), status: u.status })}
                              className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(u.id)} disabled={actionLoading === u.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Faculties Tab */}
        {activeTab === 'faculties' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Faculty Management</CardTitle>
              <button onClick={() => setFacultyModal({ name: '', description: '' })}
                className="text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor:'#1B5E20'}}>
                <Plus className="w-4 h-4" /> Add Faculty
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Departments</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {faculties.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{f.name}</td>
                        <td className="py-3 px-4 text-sm">{f.description || '—'}</td>
                        <td className="py-3 px-4 text-sm">{departments.filter(d => d.faculty_id === f.id).length}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => setFacultyModal({ id: f.id, name: f.name, description: f.description || '' })}
                              className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteFaculty(f.id)} disabled={actionLoading === f.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Department Management</CardTitle>
              <button onClick={() => setDepartmentModal({ faculty_id: '', name: '' })}
                className="text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor:'#1B5E20'}}>
                <Plus className="w-4 h-4" /> Add Department
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Faculty</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {departments.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{d.name}</td>
                        <td className="py-3 px-4 text-sm">{d.faculty_name}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => setDepartmentModal({ id: d.id, faculty_id: String(d.faculty_id), name: d.name })}
                              className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteDepartment(d.id)} disabled={actionLoading === d.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Modal */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{userModal.id ? 'Edit User' : 'Add User'}</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={userModal.name} onChange={e => setUserModal({...userModal, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={userModal.email} onChange={e => setUserModal({...userModal, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Password {userModal.id ? '(leave blank to keep)' : ''}</label>
                <input type="password" value={userModal.password} onChange={e => setUserModal({...userModal, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={userModal.role} onChange={e => setUserModal({...userModal, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="faculty">Faculty</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="student">Student</option>
                  <option value="auditor">Auditor</option>
                  <option value="external_reviewer">External Reviewer</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select value={userModal.faculty_id} onChange={e => setUserModal({...userModal, faculty_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">None</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={userModal.department_id} onChange={e => setUserModal({...userModal, department_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">None</option>
                  {departments.filter(d => !userModal.faculty_id || d.faculty_id === Number(userModal.faculty_id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={userModal.status} onChange={e => setUserModal({...userModal, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveUser} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {actionLoading !== null ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setUserModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Modal */}
      {facultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{facultyModal.id ? 'Edit Faculty' : 'Add Faculty'}</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={facultyModal.name} onChange={e => setFacultyModal({...facultyModal, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={facultyModal.description} onChange={e => setFacultyModal({...facultyModal, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveFaculty} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {actionLoading !== null ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setFacultyModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {departmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{departmentModal.id ? 'Edit Department' : 'Add Department'}</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select value={departmentModal.faculty_id} onChange={e => setDepartmentModal({...departmentModal, faculty_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select faculty...</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={departmentModal.name} onChange={e => setDepartmentModal({...departmentModal, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveDepartment} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {actionLoading !== null ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setDepartmentModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>}>
      <SuperAdminDashboardContent />
    </Suspense>
  );
}
