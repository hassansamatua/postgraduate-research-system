'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { FileText, Users, AlertTriangle, ShieldCheck, Plus } from 'lucide-react';

function AuditorDashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'research' | 'workload' | 'compliance'>('research');
  const [user, setUser] = useState({ name: '', role: 'auditor' });
  const [stats, setStats] = useState({
    totalResearch: 0,
    pendingAudit: 0,
    riskFlags: 0,
    completedAudit: 0,
  });
  const [researchTitles, setResearchTitles] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [auditComments, setAuditComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentModal, setCommentModal] = useState<{ studentId: string; comment: string; riskLevel: string } | null>(null);

  const fetchData = async () => {
    try {
      const token = getCookie('token');
      const payload = decodeToken(token || '');
      if (payload) {
        setUser({ name: payload.name, role: payload.role });
        const [titlesRes, studRes, commentsRes] = await Promise.all([
          fetch('/api/research-titles'),
          fetch('/api/students'),
          fetch('/api/audit-comments'),
        ]);
        const [titlesData, studData, commentsData] = await Promise.all([
          titlesRes.json(), studRes.json(), commentsRes.json(),
        ]);
        if (titlesData.researchTitles) {
          setResearchTitles(titlesData.researchTitles);
          setStats({
            totalResearch: titlesData.researchTitles.length,
            pendingAudit: titlesData.researchTitles.filter((t: any) => t.faculty_status === 'pending' || t.admin_status === 'pending').length,
            riskFlags: commentsData.auditComments?.filter((c: any) => c.status === 'open').length || 0,
            completedAudit: titlesData.researchTitles.filter((t: any) => t.faculty_status === 'approved' && t.admin_status === 'authorized').length,
          });
        }
        if (studData.students) setStudents(studData.students);
        if (commentsData.auditComments) setAuditComments(commentsData.auditComments);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'research' | 'workload' | 'compliance' | null;
    if (tabParam && ['research', 'workload', 'compliance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <DashboardLayout role="auditor" userName={user.name}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="auditor" userName={user.name}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Research</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalResearch}</p>
                </div>
                <FileText className="w-12 h-12 text-zu-green" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Audit</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingAudit}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Risk Flags</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.riskFlags}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Audit</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completedAudit}</p>
                </div>
                <ShieldCheck className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Research Titles Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Research Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Research Area</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Faculty Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Admin Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {researchTitles.map((title) => (
                    <tr key={title.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{title.student_name}</td>
                      <td className="py-3 px-4 text-sm">{title.title}</td>
                      <td className="py-3 px-4 text-sm">{title.research_area}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={title.faculty_status} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={title.admin_status} />
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => setCommentModal({ studentId: String(title.student_id), comment: '', riskLevel: 'low' })}
                          className="text-white text-xs px-3 py-1.5 rounded flex items-center gap-1" style={{backgroundColor:'#1B5E20'}}>
                          <Plus className="w-3 h-3" /> Comment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Audit Comments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Audit Comments & Risk Flags</CardTitle>
            <button onClick={() => setCommentModal({ studentId: '', comment: '', riskLevel: 'low' })}
              className="text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor:'#1B5E20'}}>
              <Plus className="w-4 h-4" /> Add Comment
            </button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Comment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Risk Level</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditComments.map((comment) => (
                    <tr key={comment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{comment.registration_number}</td>
                      <td className="py-3 px-4 text-sm">{comment.comment}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          comment.risk_level === 'high' || comment.risk_level === 'critical' 
                            ? 'bg-red-100 text-red-800' 
                            : comment.risk_level === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {comment.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={comment.status} />
                      </td>
                    </tr>
                  ))}
                  {auditComments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No audit comments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Add Audit Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Audit Comment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select value={commentModal.studentId} onChange={e => setCommentModal({...commentModal, studentId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.registration_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment / Observation</label>
                <textarea rows={4} value={commentModal.comment} onChange={e => setCommentModal({...commentModal, comment: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  placeholder="Describe the audit finding or compliance issue..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <select value={commentModal.riskLevel} onChange={e => setCommentModal({...commentModal, riskLevel: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                disabled={submitting || !commentModal.studentId || !commentModal.comment}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const res = await fetch('/api/audit-comments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ studentId: Number(commentModal.studentId), comment: commentModal.comment, riskLevel: commentModal.riskLevel }),
                    });
                    if (res.ok) { setCommentModal(null); await fetchData(); }
                  } finally { setSubmitting(false); }
                }}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {submitting ? 'Submitting...' : 'Add Comment'}
              </button>
              <button onClick={() => setCommentModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AuditorDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>}>
      <AuditorDashboardContent />
    </Suspense>
  );
}
