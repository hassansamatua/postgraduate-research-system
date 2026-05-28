'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { FileText, Users, AlertTriangle, ShieldCheck, Plus, Clock, BarChart2, CheckCircle, Printer } from 'lucide-react';
import AuditReport from './AuditReport';

function timePending(submittedAt: string): string {
  const diff = Date.now() - new Date(submittedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function daysPending(submittedAt: string): number {
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86400000);
}

function AuditorDashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'research' | 'workload' | 'compliance'>('research');
  const [user, setUser] = useState({ name: '', role: 'auditor' });
  const [stats, setStats] = useState({ totalResearch: 0, pendingAudit: 0, riskFlags: 0, completedAudit: 0 });
  const [researchTitles, setResearchTitles] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [auditComments, setAuditComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentModal, setCommentModal] = useState<{ studentId: string; comment: string; riskLevel: string } | null>(null);
  const [showReport, setShowReport] = useState(false);

  const fetchData = async () => {
    try {
      const token = getCookie('token');
      const payload = decodeToken(token || '');
      if (payload) {
        setUser({ name: payload.name, role: payload.role });
        const [titlesRes, studRes, commentsRes, supRes] = await Promise.all([
          fetch('/api/research-titles'),
          fetch('/api/students'),
          fetch('/api/audit-comments'),
          fetch('/api/supervisors'),
        ]);
        const [titlesData, studData, commentsData, supData] = await Promise.all([
          titlesRes.json(), studRes.json(), commentsRes.json(), supRes.json(),
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
        if (supData.supervisors) setSupervisors(supData.supervisors);
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
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  // Compliance calculations
  const overdueItems = researchTitles.filter(t =>
    (t.faculty_status === 'pending' || t.admin_status === 'pending') && t.submitted_at && daysPending(t.submitted_at) >= 7
  );
  const studentsWithoutTitle = students.filter(s => !researchTitles.find(t => t.student_id === s.id));
  const openRiskFlags = auditComments.filter(c => c.status === 'open');
  const overloadedSupervisors = supervisors.filter(s => s.current_students >= s.max_students);

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout role="auditor" userName={user.name}>
      <div className="space-y-6">
        {/* Page header with Generate Report */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit &amp; Quality Assurance</h1>
            <p className="text-sm text-gray-500 mt-0.5">DVC Academic &amp; Quality Assurance Panel</p>
          </div>
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg shadow" style={{backgroundColor:'#1B5E20'}}>
            <Printer className="w-4 h-4" /> Generate Report
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Total Research</p><p className="text-3xl font-bold text-gray-900">{stats.totalResearch}</p></div>
              <FileText className="w-12 h-12" style={{color:'#1B5E20'}} />
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Pending Audit</p><p className="text-3xl font-bold text-gray-900">{stats.pendingAudit}</p></div>
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Risk Flags</p><p className="text-3xl font-bold text-gray-900">{stats.riskFlags}</p></div>
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Completed Audit</p><p className="text-3xl font-bold text-gray-900">{stats.completedAudit}</p></div>
              <ShieldCheck className="w-12 h-12 text-green-600" />
            </div>
          </CardContent></Card>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {([
              { id: 'research', label: 'All Research Topics', icon: FileText },
              { id: 'workload', label: 'Supervisor Workload', icon: BarChart2 },
              { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>All Research Topics</CardTitle></CardHeader>
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
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Time Pending</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {researchTitles.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No research titles found</td></tr>
                      )}
                      {researchTitles.map((title) => (
                        <tr key={title.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium">{title.student_name}</td>
                          <td className="py-3 px-4 text-sm max-w-xs truncate">{title.title}</td>
                          <td className="py-3 px-4 text-sm">{title.research_area}</td>
                          <td className="py-3 px-4"><StatusBadge status={title.faculty_status} /></td>
                          <td className="py-3 px-4"><StatusBadge status={title.admin_status} /></td>
                          <td className="py-3 px-4">
                            {(title.faculty_status === 'pending' || title.admin_status === 'pending') && title.submitted_at ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${daysPending(title.submitted_at) >= 7 ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                                <Clock className="w-3 h-3" />{timePending(title.submitted_at)}
                              </span>
                            ) : <span className="text-xs text-gray-400">—</span>}
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
                      {auditComments.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">No audit comments</td></tr>
                      )}
                      {auditComments.map((comment) => (
                        <tr key={comment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium">{comment.registration_number}</td>
                          <td className="py-3 px-4 text-sm">{comment.comment}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${comment.risk_level === 'high' || comment.risk_level === 'critical' ? 'bg-red-100 text-red-800' : comment.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {comment.risk_level}
                            </span>
                          </td>
                          <td className="py-3 px-4"><StatusBadge status={comment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workload Tab */}
        {activeTab === 'workload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Supervisor Workload</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Supervisor</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Faculty</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Department</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Students</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Capacity</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Workload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisors.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No supervisors found</td></tr>
                      )}
                      {supervisors.map((sup) => {
                        const pct = sup.max_students > 0 ? Math.round((sup.current_students / sup.max_students) * 100) : 0;
                        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-400' : 'bg-green-500';
                        return (
                          <tr key={sup.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium">{sup.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{sup.faculty_name || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{sup.department_name || '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${sup.supervisor_type === 'main' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {sup.supervisor_type === 'main' ? 'Main' : 'Co'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">{sup.current_students}</td>
                            <td className="py-3 px-4 text-sm">{sup.max_students}</td>
                            <td className="py-3 px-4 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div className={`h-2 rounded-full ${barColor}`} style={{width:`${Math.min(pct,100)}%`}} />
                                </div>
                                <span className={`text-xs font-semibold w-10 text-right ${pct >= 100 ? 'text-red-600' : pct >= 75 ? 'text-orange-600' : 'text-green-700'}`}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Student distribution summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Supervisors</p>
                <p className="text-2xl font-bold text-gray-900">{supervisors.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overloaded (at capacity)</p>
                <p className="text-2xl font-bold text-red-600">{overloadedSupervisors.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Students Supervised</p>
                <p className="text-2xl font-bold text-gray-900">{supervisors.reduce((a, s) => a + (s.current_students || 0), 0)}</p>
              </CardContent></Card>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Compliance summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue (&gt;7 days pending)</p>
                  <p className="text-2xl font-bold text-red-600">{overdueItems.length}</p>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Students Without Title</p>
                  <p className="text-2xl font-bold text-yellow-600">{studentsWithoutTitle.length}</p>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Open Risk Flags</p>
                  <p className="text-2xl font-bold text-orange-600">{openRiskFlags.length}</p>
                </div>
              </CardContent></Card>
            </div>

            {/* Overdue pending items */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Overdue Pending Items (&gt;7 days)</CardTitle></CardHeader>
              <CardContent>
                {overdueItems.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 text-green-700"><CheckCircle className="w-5 h-5" /><p className="text-sm font-medium">No overdue items — all submissions reviewed within 7 days.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Title</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Faculty Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Admin Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Waiting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueItems.map(t => (
                          <tr key={t.id} className="border-b border-gray-100 hover:bg-red-50">
                            <td className="py-3 px-4 text-sm font-medium">{t.student_name}</td>
                            <td className="py-3 px-4 text-sm max-w-xs truncate">{t.title}</td>
                            <td className="py-3 px-4"><StatusBadge status={t.faculty_status} /></td>
                            <td className="py-3 px-4"><StatusBadge status={t.admin_status} /></td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />{daysPending(t.submitted_at)}d overdue
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students without title */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-yellow-500" /> Students Without Research Title</CardTitle></CardHeader>
              <CardContent>
                {studentsWithoutTitle.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 text-green-700"><CheckCircle className="w-5 h-5" /><p className="text-sm font-medium">All students have submitted a research title.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Reg. No.</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Program</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsWithoutTitle.map(s => (
                          <tr key={s.id} className="border-b border-gray-100 hover:bg-yellow-50">
                            <td className="py-3 px-4 text-sm font-medium">{s.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{s.registration_number}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{s.program || '—'}</td>
                            <td className="py-3 px-4"><StatusBadge status={s.research_status || 'not_started'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open risk flags */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Open Risk Flags</CardTitle></CardHeader>
              <CardContent>
                {openRiskFlags.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 text-green-700"><CheckCircle className="w-5 h-5" /><p className="text-sm font-medium">No open risk flags.</p></div>
                ) : (
                  <div className="space-y-3">
                    {openRiskFlags.map(c => (
                      <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${c.risk_level === 'critical' || c.risk_level === 'high' ? 'bg-red-50 border-red-200' : c.risk_level === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${c.risk_level === 'critical' ? 'bg-red-600 text-white' : c.risk_level === 'high' ? 'bg-red-100 text-red-700' : c.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.risk_level?.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{c.registration_number}</p>
                          <p className="text-sm text-gray-600 mt-0.5">{c.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
      {/* Audit Report Modal */}
      {showReport && (
        <AuditReport
          user={user}
          stats={stats}
          researchTitles={researchTitles}
          students={students}
          supervisors={supervisors}
          auditComments={auditComments}
          overdueItems={overdueItems}
          studentsWithoutTitle={studentsWithoutTitle}
          openRiskFlags={openRiskFlags}
          overloadedSupervisors={overloadedSupervisors}
          onClose={() => setShowReport(false)}
        />
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
