'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { Users, FileText, Calendar, CheckCircle, Clock, AlertCircle, Shield, BookOpen, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState({ name: '', role: 'admin' });
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingFacultyReview: 0,
    pendingAuthorization: 0,
    pendingProposalDefenses: 0,
    pendingFinalDefenses: 0,
    pendingExternalReviews: 0,
    completedResearch: 0,
  });
  const [pendingTitles, setPendingTitles] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'authorizations' | 'students' | 'activity' | 'defenses' | 'ext_reviews' | 'reports'>('authorizations');
  const [rejectModal, setRejectModal] = useState<{ id: number; comments: string } | null>(null);
  const [defenses, setDefenses] = useState<any[]>([]);
  const [externalReviewers, setExternalReviewers] = useState<any[]>([]);
  const [scheduleModal, setScheduleModal] = useState<{ studentId: string; defenseType: 'proposal' | 'final'; date: string; time: string; venue: string; panelMembers: string } | null>(null);
  const [assignModal, setAssignModal] = useState<{ studentId: string; reviewerId: string; deadline: string } | null>(null);
  const [completeModal, setCompleteModal] = useState<{ studentId: number; studentName: string } | null>(null);
  const [report, setReport] = useState<any[]>([]);
  const [reportType, setReportType] = useState('student_progress');
  const [reportLoading, setReportLoading] = useState(false);

  const fetchData = async () => {
    try {
      const token = getCookie('token');
      const payload = decodeToken(token || '');
      if (payload) setUser({ name: payload.name, role: payload.role });

      const res = await fetch('/api/dashboard/admin');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setPendingTitles(data.pendingTitles || []);
        setStudents(data.students || []);
        setRecentLogs(data.recentLogs || []);
      }
      const [defRes, erRes] = await Promise.all([
        fetch('/api/defenses'),
        fetch('/api/users?role=external_reviewer'),
      ]);
      const [defData, erData] = await Promise.all([defRes.json(), erRes.json()]);
      if (defData.defenses) setDefenses(defData.defenses);
      if (erData.users) setExternalReviewers(erData.users);
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAuthorize = async (titleId: number) => {
    setActionLoading(titleId);
    try {
      const res = await fetch(`/api/research-titles/${titleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminStatus: 'authorized' }),
      });
      if (res.ok) await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleDefense = async () => {
    if (!scheduleModal) return;
    setActionLoading(-1);
    try {
      const res = await fetch('/api/defenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: Number(scheduleModal.studentId),
          defenseType: scheduleModal.defenseType,
          date: scheduleModal.date,
          time: scheduleModal.time,
          venue: scheduleModal.venue,
          panelMembers: scheduleModal.panelMembers,
        }),
      });
      if (res.ok) { setScheduleModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handleAssignReviewer = async () => {
    if (!assignModal) return;
    setActionLoading(-2);
    try {
      const res = await fetch('/api/external-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: Number(assignModal.studentId),
          externalReviewerId: Number(assignModal.reviewerId),
          deadline: assignModal.deadline,
        }),
      });
      if (res.ok) { setAssignModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handleMarkComplete = async () => {
    if (!completeModal) return;
    setActionLoading(-3);
    try {
      const res = await fetch(`/api/students/${completeModal.studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchStatus: 'completed', currentStage: 'completion' }),
      });
      if (res.ok) { setCompleteModal(null); await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/reports?reportType=${reportType}`);
      const data = await res.json();
      if (data.report) setReport(data.report);
    } finally { setReportLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      const res = await fetch(`/api/research-titles/${rejectModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminStatus: 'rejected', adminComments: rejectModal.comments }),
      });
      if (res.ok) { setRejectModal(null); await fetchData(); }
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: '#1B5E20', bg: '#E8F5E9' },
    { label: 'Faculty Review', value: stats.pendingFacultyReview, icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Pending Auth.', value: stats.pendingAuthorization, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
    { label: 'Proposal Def.', value: stats.pendingProposalDefenses, icon: Calendar, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Final Def.', value: stats.pendingFinalDefenses, icon: BookOpen, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Ext. Reviews', value: stats.pendingExternalReviews, icon: Shield, color: '#FFC107', bg: '#FFF8E1' },
    { label: 'Completed', value: stats.completedResearch, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
  ];

  if (loading) {
    return (
      <DashboardLayout role="admin" userName="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-500">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" userName={user.name}>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Postgraduate Research Management — Zanzibar University</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor: card.bg}}>
                      <Icon className="w-5 h-5" style={{color: card.color}} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-500 leading-tight">{card.label}</p>
                    </div>
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
              { id: 'authorizations' as const, label: 'Pending Authorizations', badge: pendingTitles.length },
              { id: 'students' as const, label: `All Students (${students.length})`, badge: 0 },
              { id: 'activity' as const, label: 'Recent Activity', badge: 0 },
              { id: 'defenses' as const, label: `Defenses (${defenses.length})`, badge: 0 },
              { id: 'ext_reviews' as const, label: 'Ext. Reviews', badge: 0 },
              { id: 'reports' as const, label: 'Reports', badge: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-700 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Pending Authorizations */}
        {activeTab === 'authorizations' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Research Titles Pending Authorization</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingTitles.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">No pending authorizations</p>
                  <p className="text-sm mt-1">All research titles have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Research Title</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supervisor</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingTitles.map((title) => (
                        <tr key={title.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900">{title.student_name}</p>
                            <p className="text-xs text-gray-400">{title.registration_number} · {title.program}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-900 max-w-xs">{title.title}</p>
                            <p className="text-xs text-gray-400">{title.research_area}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-700">{title.supervisor_name || '—'}</p>
                            <p className="text-xs text-gray-400">{title.supervisor_specialization}</p>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={title.faculty_status} />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAuthorize(title.id)}
                                disabled={actionLoading === title.id}
                                className="text-white text-xs px-3 py-1.5 rounded font-medium hover:opacity-90 disabled:opacity-50"
                                style={{backgroundColor:'#1B5E20'}}
                              >
                                {actionLoading === title.id ? '...' : 'Authorize'}
                              </button>
                              <button
                                onClick={() => setRejectModal({ id: title.id, comments: '' })}
                                disabled={actionLoading === title.id}
                                className="bg-red-600 text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-red-700 disabled:opacity-50"
                              >
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

        {/* All Students */}
        {activeTab === 'students' && (
          <Card>
            <CardHeader>
              <CardTitle>All Registered Students</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3" />
                  <p>No students registered yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Stage</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-400">{student.registration_number}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{student.program}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{student.faculty_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 capitalize">{student.current_stage?.replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4"><StatusBadge status={student.research_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Defenses Tab */}
        {activeTab === 'defenses' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Defense Schedule</CardTitle>
              <button onClick={() => setScheduleModal({ studentId: '', defenseType: 'proposal', date: '', time: '', venue: '', panelMembers: '' })}
                className="text-white text-sm px-4 py-2 rounded-lg" style={{backgroundColor:'#1B5E20'}}>+ Schedule Defense</button>
            </CardHeader>
            <CardContent className="p-0">
              {defenses.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Calendar className="w-12 h-12 mx-auto mb-3" /><p>No defenses scheduled yet.</p></div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full">
                  <thead><tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Time</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Venue</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {defenses.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4"><p className="text-sm font-medium">{d.student_name}</p><p className="text-xs text-gray-400">{d.registration_number}</p></td>
                        <td className="py-3 px-4"><span className={`text-xs font-medium px-2 py-1 rounded-full ${d.defense_type === 'proposal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{d.defense_type}</span></td>
                        <td className="py-3 px-4 text-sm">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-sm">{d.time}</td>
                        <td className="py-3 px-4 text-sm">{d.venue || '—'}</td>
                        <td className="py-3 px-4"><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        )}

        {/* External Reviews Tab */}
        {activeTab === 'ext_reviews' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>External Review Assignments</CardTitle>
              <button onClick={() => setAssignModal({ studentId: '', reviewerId: '', deadline: '' })}
                className="text-white text-sm px-4 py-2 rounded-lg" style={{backgroundColor:'#1B5E20'}}>+ Assign Reviewer</button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Assign external reviewers to students at the external review stage. Available reviewers: {externalReviewers.length}</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {externalReviewers.map(er => (
                  <div key={er.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <div><p className="text-sm font-medium">{er.name}</p><p className="text-xs text-gray-400">{er.email}</p></div>
                    <button onClick={() => setAssignModal({ studentId: '', reviewerId: String(er.id), deadline: '' })}
                      className="text-xs text-white px-3 py-1.5 rounded" style={{backgroundColor:'#1B5E20'}}>Assign</button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <Card>
            <CardHeader><CardTitle>Generate Reports</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <select value={reportType} onChange={e => setReportType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="student_progress">Student Progress Report</option>
                  <option value="supervisor_workload">Supervisor Workload</option>
                  <option value="pending_approvals">Pending Approvals</option>
                </select>
                <button onClick={generateReport} disabled={reportLoading}
                  className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                  {reportLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
              {report.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 bg-gray-50">
                      {Object.keys(report[0]).map(k => <th key={k} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{k.replace(/_/g, ' ')}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((val: any, j) => <td key={j} className="py-2 px-3 text-sm text-gray-700">{String(val ?? '—')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Log */}
        {activeTab === 'activity' && (
          <Card>
            <CardHeader><CardTitle>Recent System Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              {recentLogs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-3" />
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{backgroundColor:'#1B5E20'}}>
                        {log.user_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900"><span className="font-medium">{log.user_name}</span> — {log.action}</p>
                        <p className="text-xs text-gray-400 truncate">{log.description}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedule Defense Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Defense</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select value={scheduleModal.studentId} onChange={e => setScheduleModal({...scheduleModal, studentId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.registration_number}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Defense Type</label>
                <select value={scheduleModal.defenseType} onChange={e => setScheduleModal({...scheduleModal, defenseType: e.target.value as 'proposal' | 'final'})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="proposal">Proposal Defense</option>
                  <option value="final">Final Defense</option>
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={scheduleModal.date} onChange={e => setScheduleModal({...scheduleModal, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" value={scheduleModal.time} onChange={e => setScheduleModal({...scheduleModal, time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input type="text" value={scheduleModal.venue} onChange={e => setScheduleModal({...scheduleModal, venue: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="e.g., Board Room A" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Panel Members</label>
                <textarea rows={2} value={scheduleModal.panelMembers} onChange={e => setScheduleModal({...scheduleModal, panelMembers: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="List panel member names..." /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleScheduleDefense} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {actionLoading !== null ? 'Scheduling...' : 'Schedule Defense'}
              </button>
              <button onClick={() => setScheduleModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Reviewer Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign External Reviewer</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select value={assignModal.studentId} onChange={e => setAssignModal({...assignModal, studentId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select student...</option>
                  {students.filter(s => s.current_stage === 'external_review').map(s => <option key={s.id} value={s.id}>{s.name} — {s.registration_number}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">External Reviewer</label>
                <select value={assignModal.reviewerId} onChange={e => setAssignModal({...assignModal, reviewerId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select reviewer...</option>
                  {externalReviewers.map(er => <option key={er.id} value={er.id}>{er.name} — {er.email}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input type="date" value={assignModal.deadline} onChange={e => setAssignModal({...assignModal, deadline: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAssignReviewer} disabled={actionLoading !== null}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {actionLoading !== null ? 'Assigning...' : 'Assign Reviewer'}
              </button>
              <button onClick={() => setAssignModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Research Title</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Reason</label>
            <textarea
              rows={4}
              value={rejectModal.comments}
              onChange={(e) => setRejectModal({ ...rejectModal, comments: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Provide reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading !== null ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
