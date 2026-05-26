'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { Users, FileText, MessageSquare, CheckCircle, Download, Send, Clock, Eye } from 'lucide-react';

function SBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800', correction_required: 'bg-orange-100 text-orange-800',
    submitted: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status?.replace(/_/g, ' ')}</span>;
}

export default function SupervisorDashboard() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState({ name: '', role: 'supervisor', userId: 0, facultyId: 0 });
  const [students, setStudents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'documents' | 'messages'>('students');

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'students' | 'documents' | 'messages' | null;
    if (tabParam && ['students', 'documents', 'messages'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<{ docId: number; studentId: number; stage: string; status: 'approved' | 'correction_required' | 'rejected'; comments: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [msgStudentId, setMsgStudentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async (p?: any) => {
    try {
      const token = getCookie('token');
      const payload = p || decodeToken(token || '');
      if (!payload) return;
      if (!p) setUser({ name: payload.name, role: payload.role, userId: payload.userId, facultyId: payload.facultyId });

      const [studRes, docRes, msgRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/documents'),
        fetch(`/api/messages?user_id=${payload.userId}`),
      ]);
      const [studData, docData, msgData] = await Promise.all([studRes.json(), docRes.json(), msgRes.json()]);

      if (studData.students) {
        const mine = studData.students.filter((s: any) => s.faculty_id === payload.facultyId);
        setStudents(mine);
      }
      if (docData.documents) setDocuments(docData.documents);
      if (msgData.messages) setMessages(msgData.messages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const token = getCookie('token');
    const p = decodeToken(token || '');
    if (p) { setUser({ name: p.name, role: p.role, userId: p.userId, facultyId: p.facultyId }); fetchAll(p); }
    else setLoading(false);
  }, []);

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: reviewModal.studentId,
          stage: reviewModal.stage,
          status: reviewModal.status,
          comments: reviewModal.comments,
        }),
      });
      await fetch(`/api/documents/${reviewModal.docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewModal.status, comments: reviewModal.comments }),
      });
      setReviewModal(null);
      await fetchAll();
    } finally { setSubmitting(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !msgStudentId) return;
    setSubmitting(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: msgStudentId, studentId: msgStudentId, message: messageText }),
      });
      setMessageText('');
      await fetchAll();
    } finally { setSubmitting(false); }
  };

  const pending = documents.filter(d => d.status === 'pending' && students.some(s => s.id === d.student_id));
  const stats = [
    { label: 'My Students', value: students.length, icon: Users, color: '#1B5E20', bg: '#E8F5E9' },
    { label: 'Docs to Review', value: pending.length, icon: FileText, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Completed', value: students.filter(s => s.research_status === 'completed').length, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Active', value: students.filter(s => s.research_status === 'in_progress').length, icon: Clock, color: '#3B82F6', bg: '#EFF6FF' },
  ];

  if (loading) {
    return (
      <DashboardLayout role="supervisor" userName={user.name}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="supervisor" userName={user.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <p className="text-sm text-gray-500">Review student documents and track research progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor: s.bg}}>
                    <Icon className="w-5 h-5" style={{color: s.color}} />
                  </div>
                  <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { id: 'students' as const, label: `Students (${students.length})` },
              { id: 'documents' as const, label: `Documents to Review (${pending.length})` },
              { id: 'messages' as const, label: 'Messages' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <Card>
            <CardHeader><CardTitle>My Students</CardTitle></CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Users className="w-12 h-12 mx-auto mb-3" /><p>No students assigned to your faculty.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Program</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4"><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.registration_number}</p></td>
                          <td className="py-3 px-4 text-sm text-gray-600">{s.program}</td>
                          <td className="py-3 px-4 text-sm capitalize text-gray-600">{s.current_stage?.replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4"><SBadge status={s.research_status} /></td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedStudent(s); setActiveTab('documents'); }}
                                className="text-white text-xs px-3 py-1.5 rounded flex items-center gap-1" style={{backgroundColor:'#1B5E20'}}>
                                <Eye className="w-3 h-3" /> Docs
                              </button>
                              <button onClick={() => { setMsgStudentId(s.user_id); setActiveTab('messages'); }}
                                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 hover:bg-blue-700">
                                <MessageSquare className="w-3 h-3" /> Message
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

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Card>
            <CardHeader><CardTitle>Documents Pending Review{selectedStudent && ` — ${selectedStudent.name}`}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(() => {
                const docs = selectedStudent
                  ? documents.filter(d => d.student_id === selectedStudent.id)
                  : pending;
                if (docs.length === 0) return <div className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" /><p>No documents pending review.</p></div>;
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr style={{backgroundColor:'#F9FAFB'}} className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Document</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Uploaded</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {docs.map(doc => {
                          const st = students.find(s => s.id === doc.student_id);
                          return (
                            <tr key={doc.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4"><p className="text-sm font-medium">{st?.name || '—'}</p><p className="text-xs text-gray-400">{st?.registration_number}</p></td>
                              <td className="py-3 px-4"><p className="text-sm font-medium">{doc.document_title}</p><p className="text-xs text-gray-400">v{doc.version_number}</p></td>
                              <td className="py-3 px-4 text-sm capitalize text-gray-600">{doc.stage?.replace(/_/g, ' ')}</td>
                              <td className="py-3 px-4 text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                              <td className="py-3 px-4"><SBadge status={doc.status} /></td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1.5">
                                  <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-white text-xs px-2 py-1.5 rounded flex items-center gap-1" style={{backgroundColor:'#1B5E20'}}><Download className="w-3 h-3" /> View</a>
                                  {doc.status === 'pending' && (
                                    <button onClick={() => setReviewModal({ docId: doc.id, studentId: doc.student_id, stage: doc.stage, status: 'approved', comments: '' })}
                                      className="bg-blue-600 text-white text-xs px-2 py-1.5 rounded hover:bg-blue-700">Review</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <Card>
            <CardHeader><CardTitle>Messages with Students</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                <select value={msgStudentId || ''} onChange={e => setMsgStudentId(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Choose a student...</option>
                  {students.map(s => <option key={s.id} value={s.user_id}>{s.name} — {s.registration_number}</option>)}
                </select>
              </div>
              {msgStudentId && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 h-64 overflow-y-auto p-3 space-y-2">
                    {messages.filter(m => m.sender_id === msgStudentId || m.receiver_id === msgStudentId).length === 0 && (
                      <p className="text-center text-sm text-gray-400 pt-20">No messages with this student yet.</p>
                    )}
                    {messages.filter(m => m.sender_id === msgStudentId || m.receiver_id === msgStudentId).map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === user.userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender_id === user.userId ? 'text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                          style={msg.sender_id === user.userId ? {backgroundColor:'#1B5E20'} : {}}>
                          <p className="text-xs font-semibold mb-0.5 opacity-75">{msg.sender_name}</p>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex border-t border-gray-200">
                    <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)}
                      placeholder="Type a message..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                    <button type="submit" disabled={submitting || !messageText.trim()} className="px-4 text-white disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Document</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
              <div className="flex gap-2">
                {(['approved', 'correction_required', 'rejected'] as const).map(action => (
                  <button key={action} onClick={() => setReviewModal({...reviewModal, status: action})}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 ${
                      reviewModal.status === action
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
            <textarea rows={3} value={reviewModal.comments} onChange={e => setReviewModal({...reviewModal, comments: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Add review comments..." />
            <div className="flex gap-3 mt-4">
              <button onClick={handleReview} disabled={submitting}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{backgroundColor: reviewModal.status === 'approved' ? '#1B5E20' : reviewModal.status === 'rejected' ? '#DC2626' : '#F59E0B'}}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setReviewModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
