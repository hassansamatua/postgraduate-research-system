'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function FacultyDashboard() {
  const [user, setUser] = useState({ name: '', role: 'faculty', facultyId: 0 });
  const [researchTitles, setResearchTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [reviewModal, setReviewModal] = useState<{
    id: number; title: string; action: 'approved' | 'rejected' | 'correction_required'; comments: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const token = getCookie('token');
      const payload = decodeToken(token || '');
      if (!payload) return;
      setUser({ name: payload.name, role: payload.role, facultyId: payload.facultyId });
      const res = await fetch(`/api/research-titles?faculty_id=${payload.facultyId}`);
      const data = await res.json();
      if (data.researchTitles) setResearchTitles(data.researchTitles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReview = async () => {
    if (!reviewModal) return;
    setActionLoading(reviewModal.id);
    try {
      const res = await fetch(`/api/research-titles/${reviewModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyStatus: reviewModal.action,
          facultyComments: reviewModal.comments,
        }),
      });
      if (res.ok) { setReviewModal(null); await fetchData(); }
    } finally {
      setActionLoading(null);
    }
  };

  const pending = researchTitles.filter(t => t.faculty_status === 'pending');
  const stats = [
    { label: 'Total Titles', value: researchTitles.length, icon: FileText, color: '#1B5E20', bg: '#E8F5E9' },
    { label: 'Pending Review', value: pending.length, icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Approved', value: researchTitles.filter(t => t.faculty_status === 'approved').length, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Rejected', value: researchTitles.filter(t => t.faculty_status === 'rejected').length, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
  ];

  if (loading) {
    return (
      <DashboardLayout role="faculty" userName="">
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="faculty" userName={user.name}>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-sm text-gray-500">Review and approve student research title proposals</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor: s.bg}}>
                    <Icon className="w-5 h-5" style={{color: s.color}} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { id: 'pending' as const, label: 'Pending Review', badge: pending.length },
              { id: 'all' as const, label: `All Titles (${researchTitles.length})`, badge: 0 },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {tab.badge > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Pending Review Table */}
        {activeTab === 'pending' && (
          <Card>
            <CardHeader><CardTitle>Research Titles Awaiting Faculty Review</CardTitle></CardHeader>
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p>No pending title reviews.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supervisor</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pending.map(title => (
                        <tr key={title.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900">{title.student_name}</p>
                            <p className="text-xs text-gray-400">{title.registration_number}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-900 max-w-xs">{title.title}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-700">{title.supervisor_name || '—'}</p>
                            <p className="text-xs text-gray-400">{title.supervisor_specialization}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{title.research_area}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setReviewModal({ id: title.id, title: title.title, action: 'approved', comments: '' })}
                                className="text-white text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90"
                                style={{backgroundColor:'#1B5E20'}}>
                                Approve
                              </button>
                              <button
                                onClick={() => setReviewModal({ id: title.id, title: title.title, action: 'correction_required', comments: '' })}
                                className="bg-yellow-500 text-white text-xs px-2.5 py-1.5 rounded font-medium hover:bg-yellow-600">
                                Correction
                              </button>
                              <button
                                onClick={() => setReviewModal({ id: title.id, title: title.title, action: 'rejected', comments: '' })}
                                className="bg-red-600 text-white text-xs px-2.5 py-1.5 rounded font-medium hover:bg-red-700">
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Titles */}
        {activeTab === 'all' && (
          <Card>
            <CardHeader><CardTitle>All Research Titles in Your Faculty</CardTitle></CardHeader>
            <CardContent className="p-0">
              {researchTitles.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3" />
                  <p>No research titles submitted yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supervisor</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {researchTitles.map(title => (
                        <tr key={title.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900">{title.student_name}</p>
                            <p className="text-xs text-gray-400">{title.registration_number}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{title.title}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{title.supervisor_name || '—'}</td>
                          <td className="py-3 px-4"><StatusBadge status={title.faculty_status} /></td>
                          <td className="py-3 px-4"><StatusBadge status={title.admin_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Review Research Title</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{reviewModal.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
              <div className="flex gap-2">
                {(['approved', 'correction_required', 'rejected'] as const).map(action => (
                  <button key={action}
                    onClick={() => setReviewModal({...reviewModal, action})}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 ${
                      reviewModal.action === action
                        ? action === 'approved' ? 'border-green-600 bg-green-50 text-green-700'
                          : action === 'rejected' ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 text-gray-500'
                    }`}>
                    {action === 'approved' ? 'Approve' : action === 'rejected' ? 'Reject' : 'Request Correction'}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea rows={4} value={reviewModal.comments}
              onChange={e => setReviewModal({...reviewModal, comments: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Add your review comments..." />

            <div className="flex gap-3 mt-4">
              <button onClick={handleReview} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{backgroundColor: reviewModal.action === 'approved' ? '#1B5E20' : reviewModal.action === 'rejected' ? '#DC2626' : '#F59E0B'}}>
                {actionLoading !== null ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setReviewModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
