'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { getCookie, decodeToken } from '@/lib/utils';
import { Lock, CheckCircle, Clock, Upload, MessageSquare, Download, FileText, Calendar, Send, AlertCircle, Star, Trophy } from 'lucide-react';

const STAGE_ORDER = [
  'title_proposal', 'admin_authorization', 'proposal_stage',
  'proposal_defense', 'chapter_4_5', 'final_report',
  'final_defense', 'external_review', 'completion',
];

const STAGE_LABELS: Record<string, string> = {
  title_proposal: 'Title Proposal',
  admin_authorization: 'Admin Auth.',
  proposal_stage: 'Proposal',
  proposal_defense: 'Proposal Defense',
  chapter_4_5: 'Ch. 4 & 5',
  final_report: 'Final Report',
  final_defense: 'Final Defense',
  external_review: 'Ext. Review',
  completion: 'Completion',
};

function isTabAccessible(stageId: string, currentStage: string, hasTitle: boolean, researchTitle: any): boolean {
  if (stageId === 'title_proposal') return true;
  if (stageId === 'admin_authorization') return hasTitle;
  if (stageId === 'proposal_stage') return researchTitle?.admin_status === 'authorized';
  return STAGE_ORDER.indexOf(stageId) <= STAGE_ORDER.indexOf(currentStage);
}

function SBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    authorized: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    correction_required: 'bg-orange-100 text-orange-800',
    completed: 'bg-blue-100 text-blue-800',
    submitted: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    passed: 'bg-green-100 text-green-800',
    passed_minor: 'bg-yellow-100 text-yellow-800',
    passed_major: 'bg-orange-100 text-orange-800',
    failed: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
    not_started: 'bg-gray-100 text-gray-600',
    accepted: 'bg-green-100 text-green-800',
    minor_corrections: 'bg-yellow-100 text-yellow-800',
    major_corrections: 'bg-orange-100 text-orange-800',
    resubmit: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState({ name: '', role: 'student', facultyId: 0, userId: 0 });
  const [studentData, setStudentData] = useState<any>(null);
  const [researchTitle, setResearchTitle] = useState<any>(null);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [proposalDefense, setProposalDefense] = useState<any>(null);
  const [finalDefense, setFinalDefense] = useState<any>(null);
  const [externalReview, setExternalReview] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [docComments, setDocComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('title_proposal');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && STAGE_ORDER.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [titleForm, setTitleForm] = useState({ title: '', description: '', researchArea: '', supervisorId: '', coSupervisorId: '' });
  const [uploadForm, setUploadForm] = useState({ documentTitle: '', file: null as File | null });
  const [ch4Form, setCh4Form] = useState({ documentTitle: '', file: null as File | null });
  const [ch5Form, setCh5Form] = useState({ documentTitle: '', file: null as File | null });
  const [finalForm, setFinalForm] = useState({ documentTitle: '', file: null as File | null });
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = async (p?: any) => {
    try {
      const token = getCookie('token');
      const payload = p || decodeToken(token || '');
      if (!payload) return;
      if (!p) setUser({ name: payload.name, role: payload.role, facultyId: payload.facultyId, userId: payload.userId });
      const sdRes = await fetch('/api/students');
      const sd = await sdRes.json();
      if (!sd.students) return;
      const mine = sd.students.find((s: any) => s.user_id === payload.userId);
      if (!mine) return;
      setStudentData(mine);
      const supUrl = mine.faculty_id && mine.department_id
        ? `/api/supervisors?faculty_id=${mine.faculty_id}&department_id=${mine.department_id}`
        : mine.faculty_id
        ? `/api/supervisors?faculty_id=${mine.faculty_id}`
        : '/api/supervisors';
      const [titleRes, supRes, docRes, defRes, extRes, msgRes, dcRes] = await Promise.all([
        fetch(`/api/research-titles?student_id=${mine.id}`),
        fetch(supUrl),
        fetch(`/api/documents?student_id=${mine.id}`),
        fetch(`/api/defenses?student_id=${mine.id}`),
        fetch(`/api/external-reviews?student_id=${mine.id}`),
        fetch(`/api/messages?user_id=${payload.userId}&student_id=${mine.id}`),
        fetch(`/api/document-comments?student_id=${mine.id}`),
      ]);
      const [td, supD, docD, defD, extD, msgD, dcD] = await Promise.all([
        titleRes.json(), supRes.json(), docRes.json(), defRes.json(), extRes.json(), msgRes.json(), dcRes.json(),
      ]);
      if (td.researchTitles?.length > 0) setResearchTitle(td.researchTitles[0]);
      if (supD.supervisors) setSupervisors(supD.supervisors);
      if (docD.documents) setDocuments(docD.documents);
      if (defD.defenses) {
        setProposalDefense(defD.defenses.find((d: any) => d.defense_type === 'proposal') || null);
        setFinalDefense(defD.defenses.find((d: any) => d.defense_type === 'final') || null);
      }
      if (extD.externalReviews?.length > 0) setExternalReview(extD.externalReviews[0]);
      if (msgD.messages) setMessages(msgD.messages);
      if (dcD.comments) setDocComments(dcD.comments);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const token = getCookie('token');
    const p = decodeToken(token || '');
    if (p) { setUser({ name: p.name, role: p.role, facultyId: p.facultyId, userId: p.userId }); fetchAll(p); }
    else setLoading(false);
  }, []);

  const handleSubmitTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/research-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          title: titleForm.title, description: titleForm.description,
          researchArea: titleForm.researchArea,
          supervisorId: Number(titleForm.supervisorId),
          coSupervisorId: titleForm.coSupervisorId ? Number(titleForm.coSupervisorId) : null,
        }),
      });
      if (res.ok) { setSuccess('Research title submitted!'); await fetchAll(); setActiveTab('admin_authorization'); }
      else { const d = await res.json(); setError(d.error || 'Failed to submit'); }
    } catch { setError('An error occurred.'); }
    finally { setSubmitting(false); }
  };

  const handleUpload = async (e: React.FormEvent, stage: string, docTitle: string, file: File | null) => {
    e.preventDefault();
    if (!studentData || !file) { setError('Please select a file.'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('student_id', String(studentData.id));
      fd.append('stage', stage);
      fd.append('document_title', docTitle);
      fd.append('file', file);
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      if (res.ok) { setSuccess('Document uploaded successfully!'); await fetchAll(); }
      else { const d = await res.json(); setError(d.error || 'Upload failed'); }
    } catch { setError('Upload error.'); }
    finally { setSubmitting(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !researchTitle || !studentData) return;
    setSubmitting(true);
    try {
      const sup = supervisors.find(s => s.id === researchTitle.supervisor_id);
      if (!sup) return;
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: sup.user_id, studentId: studentData.id, message: messageText }),
      });
      setMessageText('');
      await fetchAll();
    } catch { console.error('Message error'); }
    finally { setSubmitting(false); }
  };

  const currentStage = studentData?.current_stage || 'title_proposal';
  const hasTitle = !!researchTitle;
  const tabAccessible = (id: string) => isTabAccessible(id, currentStage, hasTitle, researchTitle);
  const tabStatus = (id: string): 'completed' | 'current' | 'locked' => {
    if (!tabAccessible(id)) return 'locked';
    const ci = STAGE_ORDER.indexOf(currentStage);
    const ti = STAGE_ORDER.indexOf(id);
    if (id === 'admin_authorization' && ci === 0 && hasTitle) return 'current';
    if (ti < ci) return 'completed';
    if (ti === ci) return 'current';
    return 'completed';
  };
  const handleTabClick = (id: string) => { if (tabAccessible(id)) setActiveTab(id); };
  const getDocsFor = (stage: string) => documents.filter(d => d.stage === stage);
  const getDocFeedback = (docId: number) => docComments.filter(c => c.document_id === docId);

  if (loading) {
    return (
      <DashboardLayout role="student" userName="">
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  const DocCard = ({ doc }: { doc: any }) => {
    const [showComments, setShowComments] = useState(false);
    const feedback = getDocFeedback(doc.id);
    const needsAttention = doc.status === 'correction_required' || doc.status === 'rejected';
    const hasComments = feedback.length > 0;
    return (
      <div className={`border rounded-xl overflow-hidden ${needsAttention ? 'border-orange-300' : 'border-gray-200'}`}>
        <div className={`flex items-center justify-between p-3 ${needsAttention ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div>
            <p className="text-sm font-medium text-gray-800">{doc.document_title}</p>
            <p className="text-xs text-gray-500 mt-0.5">Version {doc.version_number} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <SBadge status={doc.status} />
            {hasComments && (
              <button
                onClick={() => setShowComments(v => !v)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium border transition-colors ${showComments ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-400 hover:bg-orange-50'}`}
              >
                <MessageSquare className="w-3 h-3" />
                {showComments ? 'Hide Comments' : `View Comments (${feedback.length})`}
              </button>
            )}
            <a href={doc.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-white px-2.5 py-1 rounded font-medium" style={{ backgroundColor: '#1B5E20' }}>
              <Download className="w-3 h-3" /> View
            </a>
          </div>
        </div>
        {showComments && hasComments && (
          <div className="p-3 border-t border-orange-200 space-y-2 bg-white">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {needsAttention ? 'Supervisor Feedback — Action Required' : 'Review History'}
            </p>
            {feedback.map((c: any) => (
              <div key={c.id} className={`rounded-lg p-3 border ${needsAttention ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">{c.commenter_name}</span>
                  <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'title_proposal':
        return (
          <div className="space-y-4">
            {!researchTitle ? (
              <>
                <p className="text-sm text-gray-500">Submit your research title proposal. All fields marked * are required.</p>
                {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
                <form onSubmit={handleSubmitTitle} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Research Title *</label>
                    <input type="text" required value={titleForm.title} onChange={e => setTitleForm({ ...titleForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="Enter your proposed research title" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description / Abstract *</label>
                    <textarea required rows={4} value={titleForm.description} onChange={e => setTitleForm({ ...titleForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="Describe your research objectives, scope and methodology..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Research Area *</label>
                    <input type="text" required value={titleForm.researchArea} onChange={e => setTitleForm({ ...titleForm, researchArea: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" placeholder="e.g., Artificial Intelligence, Structural Engineering" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Main Supervisor *</label>
                      <select required value={titleForm.supervisorId} onChange={e => setTitleForm({ ...titleForm, supervisorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                        <option value="">Select supervisor...</option>
                        {supervisors.filter(s => s.supervisor_type === 'main' && s.current_students < s.max_students).map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name} — {sup.specialization} ({sup.current_students}/{sup.max_students})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Co-Supervisor (Optional)</label>
                      <select value={titleForm.coSupervisorId} onChange={e => setTitleForm({ ...titleForm, coSupervisorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                        <option value="">None</option>
                        {supervisors.filter(s => String(s.id) !== titleForm.supervisorId).map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name} — {sup.specialization}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}>
                    {submitting ? 'Submitting...' : 'Submit Research Title →'}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Submitted Research Title</p>
                  <p className="text-base font-bold text-gray-900">{researchTitle.title}</p>
                  <p className="text-sm text-gray-600 mt-2">{researchTitle.description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border border-gray-200 p-3 rounded-lg"><p className="text-xs text-gray-500">Research Area</p><p className="text-sm font-semibold mt-1">{researchTitle.research_area}</p></div>
                  <div className="bg-white border border-gray-200 p-3 rounded-lg"><p className="text-xs text-gray-500">Supervisor</p><p className="text-sm font-semibold mt-1">{researchTitle.supervisor_name || 'N/A'}</p></div>
                  <div className="bg-white border border-gray-200 p-3 rounded-lg"><p className="text-xs text-gray-500">Faculty Review</p><div className="mt-1"><SBadge status={researchTitle.faculty_status} /></div></div>
                  <div className="bg-white border border-gray-200 p-3 rounded-lg"><p className="text-xs text-gray-500">Admin Auth.</p><div className="mt-1"><SBadge status={researchTitle.admin_status} /></div></div>
                </div>
                {researchTitle.faculty_comments && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-xs font-bold text-yellow-800 uppercase">Faculty Feedback</p>
                    <p className="text-sm text-yellow-700 mt-1">{researchTitle.faculty_comments}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'admin_authorization':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This stage tracks faculty review and admin authorization of your research title.</p>
            {researchTitle ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-600" /></div><p className="font-semibold text-gray-900">Faculty Review</p></div>
                    <SBadge status={researchTitle.faculty_status} />
                    {researchTitle.faculty_comments && <p className="text-sm text-gray-600 mt-2 italic">"{researchTitle.faculty_comments}"</p>}
                  </div>
                  <div className="border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div><p className="font-semibold text-gray-900">Admin Authorization</p></div>
                    <SBadge status={researchTitle.admin_status} />
                    {researchTitle.admin_comments && <p className="text-sm text-gray-600 mt-2 italic">"{researchTitle.admin_comments}"</p>}
                  </div>
                </div>
                {researchTitle.admin_status === 'authorized' ? (
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#E8F5E9' }}>
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#1B5E20' }} />
                    <p className="font-semibold" style={{ color: '#1B5E20' }}>Authorization Complete!</p>
                    <p className="text-sm text-gray-600 mt-1">Your title has been authorized. Proceed to the Proposal tab.</p>
                    <button onClick={() => setActiveTab('proposal_stage')} className="mt-3 text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90" style={{ backgroundColor: '#1B5E20' }}>Go to Proposal Stage →</button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div><p className="font-medium text-yellow-800">Waiting for Authorization</p><p className="text-sm text-yellow-700 mt-1">Your title is being reviewed. You will be notified once authorized by admin.</p></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400"><Lock className="w-10 h-10 mx-auto mb-2" /><p>Submit your research title in Tab 1 first.</p></div>
            )}
          </div>
        );

      case 'proposal_stage':
        return (
          <div className="space-y-6">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Proposal Document</h3>
              <form onSubmit={e => handleUpload(e, 'proposal', uploadForm.documentTitle, uploadForm.file)} className="space-y-3">
                <input type="text" required placeholder="Document title (e.g., Research Proposal v1)" value={uploadForm.documentTitle} onChange={e => setUploadForm({ ...uploadForm, documentTitle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                <input type="file" required accept=".pdf,.doc,.docx" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} className="w-full text-sm text-gray-500" />
                <p className="text-xs text-gray-400">Accepted: PDF, DOC, DOCX only</p>
                <button type="submit" disabled={submitting} className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}>{submitting ? 'Uploading...' : 'Upload Document'}</button>
              </form>
            </div>
            {getDocsFor('proposal').length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Uploaded Documents</h3>
                <div className="space-y-2">
                  {getDocsFor('proposal').map(doc => <DocCard key={doc.id} doc={doc} />)}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Messages with Supervisor</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 h-48 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && <p className="text-center text-sm text-gray-400 pt-12">No messages yet. Start a conversation with your supervisor.</p>}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user.userId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender_id === user.userId ? 'text-white' : 'bg-white border border-gray-200 text-gray-800'}`} style={msg.sender_id === user.userId ? { backgroundColor: '#1B5E20' } : {}}>
                        <p className="text-xs font-semibold mb-0.5 opacity-75">{msg.sender_name}</p>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex border-t border-gray-200">
                  <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                  <button type="submit" disabled={submitting || !messageText.trim()} className="px-4 text-white disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          </div>
        );

      case 'proposal_defense':
        return (
          <div className="space-y-4">
            {proposalDefense ? (
              <div className="rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4"><Calendar className="w-6 h-6" style={{ color: '#1B5E20' }} /><h3 className="text-lg font-bold text-gray-900">Proposal Defense Schedule</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Date</p><p className="text-sm font-semibold mt-1">{new Date(proposalDefense.date).toLocaleDateString()}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Time</p><p className="text-sm font-semibold mt-1">{proposalDefense.time}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Venue</p><p className="text-sm font-semibold mt-1">{proposalDefense.venue || 'TBD'}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Status</p><div className="mt-1"><SBadge status={proposalDefense.status} /></div></div>
                </div>
                {proposalDefense.panel_members && <div className="mt-4"><p className="text-xs text-gray-500 mb-1">Panel Members</p><p className="text-sm text-gray-800">{proposalDefense.panel_members}</p></div>}
                {proposalDefense.result && (
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <p className="text-xs font-bold uppercase" style={{ color: '#1B5E20' }}>Defense Result</p>
                    <div className="mt-1"><SBadge status={proposalDefense.result} /></div>
                    {proposalDefense.remarks && <p className="text-sm text-gray-700 mt-2">{proposalDefense.remarks}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><Calendar className="w-12 h-12 mx-auto mb-3" /><p className="font-medium text-gray-500">No defense scheduled yet</p><p className="text-sm mt-1">Admin will schedule your proposal defense once your proposal is approved.</p></div>
            )}
          </div>
        );

      case 'chapter_4_5':
        return (
          <div className="space-y-6">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Chapter 4</h3>
                <form onSubmit={e => handleUpload(e, 'chapter_4', ch4Form.documentTitle, ch4Form.file)} className="space-y-3">
                  <input type="text" required placeholder="Document title" value={ch4Form.documentTitle} onChange={e => setCh4Form({ ...ch4Form, documentTitle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                  <input type="file" required accept=".pdf,.doc,.docx" onChange={e => setCh4Form({ ...ch4Form, file: e.target.files?.[0] || null })} className="w-full text-sm text-gray-500" />
                  <button type="submit" disabled={submitting} className="w-full text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}>Upload Chapter 4</button>
                </form>
                {getDocsFor('chapter_4').map(doc => <DocCard key={doc.id} doc={doc} />)}
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Chapter 5</h3>
                <form onSubmit={e => handleUpload(e, 'chapter_5', ch5Form.documentTitle, ch5Form.file)} className="space-y-3">
                  <input type="text" required placeholder="Document title" value={ch5Form.documentTitle} onChange={e => setCh5Form({ ...ch5Form, documentTitle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                  <input type="file" required accept=".pdf,.doc,.docx" onChange={e => setCh5Form({ ...ch5Form, file: e.target.files?.[0] || null })} className="w-full text-sm text-gray-500" />
                  <button type="submit" disabled={submitting} className="w-full text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}>Upload Chapter 5</button>
                </form>
                {getDocsFor('chapter_5').map(doc => <DocCard key={doc.id} doc={doc} />)}
              </div>
            </div>
          </div>
        );

      case 'final_report':
        return (
          <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
            <p className="text-sm text-gray-500">Upload your complete research report including all chapters, references and appendices.</p>
            <form onSubmit={e => handleUpload(e, 'final_report', finalForm.documentTitle, finalForm.file)} className="space-y-3">
              <input type="text" required placeholder="Document title (e.g., Final Research Report)" value={finalForm.documentTitle} onChange={e => setFinalForm({ ...finalForm, documentTitle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
              <input type="file" required accept=".pdf,.doc,.docx" onChange={e => setFinalForm({ ...finalForm, file: e.target.files?.[0] || null })} className="w-full text-sm text-gray-500" />
              <button type="submit" disabled={submitting} className="text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#1B5E20' }}>{submitting ? 'Uploading...' : 'Upload Final Report'}</button>
            </form>
            {getDocsFor('final_report').length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Submitted Reports</h3>
                {getDocsFor('final_report').map(doc => <DocCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </div>
        );

      case 'final_defense':
        return (
          <div className="space-y-4">
            {finalDefense ? (
              <div className="rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4"><Star className="w-6 h-6" style={{ color: '#1B5E20' }} /><h3 className="text-lg font-bold text-gray-900">Final Defense Schedule</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Date</p><p className="text-sm font-semibold mt-1">{new Date(finalDefense.date).toLocaleDateString()}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Time</p><p className="text-sm font-semibold mt-1">{finalDefense.time}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Venue</p><p className="text-sm font-semibold mt-1">{finalDefense.venue || 'TBD'}</p></div>
                  <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Status</p><div className="mt-1"><SBadge status={finalDefense.status} /></div></div>
                </div>
                {finalDefense.panel_members && <div className="mt-4"><p className="text-xs text-gray-500 mb-1">Panel Members</p><p className="text-sm text-gray-800">{finalDefense.panel_members}</p></div>}
                {finalDefense.result && (
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <p className="text-xs font-bold uppercase" style={{ color: '#1B5E20' }}>Defense Result</p>
                    <div className="mt-1"><SBadge status={finalDefense.result} /></div>
                    {finalDefense.remarks && <p className="text-sm text-gray-700 mt-2">{finalDefense.remarks}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><Star className="w-12 h-12 mx-auto mb-3" /><p className="font-medium text-gray-500">No final defense scheduled yet</p><p className="text-sm mt-1">Admin will schedule the final defense after your report is approved.</p></div>
            )}
          </div>
        );

      case 'external_review':
        return (
          <div className="space-y-4">
            {externalReview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 uppercase">Review Status</p><div className="mt-2"><SBadge status={externalReview.status} /></div></div>
                  <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 uppercase">Recommendation</p><div className="mt-2"><SBadge status={externalReview.recommendation || 'pending'} /></div></div>
                  <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 uppercase">Marks</p><p className="text-2xl font-bold mt-1" style={{ color: '#1B5E20' }}>{externalReview.marks != null ? `${externalReview.marks}/100` : '—'}</p></div>
                </div>
                {externalReview.comments && (
                  <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 uppercase mb-2">Reviewer Comments</p><p className="text-sm text-gray-700">{externalReview.comments}</p></div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><AlertCircle className="w-12 h-12 mx-auto mb-3" /><p className="font-medium text-gray-500">External review pending</p><p className="text-sm mt-1">Admin will assign an external reviewer after your final defense.</p></div>
            )}
          </div>
        );

      case 'completion':
        return (
          <div className="space-y-4">
            {studentData?.research_status === 'completed' ? (
              <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#E8F5E9' }}>
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: '#1B5E20' }} />
                <h3 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>Congratulations!</h3>
                <p className="text-gray-600 mt-2">Your research has been successfully completed.</p>
                <div className="mt-4"><SBadge status="completed" /></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 uppercase mb-2">Final Research Status</p><SBadge status={studentData?.research_status || 'in_progress'} /></div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-sm text-blue-700">Your research completion decision is pending admin review of all approvals, defense results, and external reviewer marks.</p></div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout role="student" userName={user.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Research Journey</h1>
          <p className="text-sm text-gray-500">Welcome, {user.name} · {studentData?.registration_number} · {studentData?.program}</p>
        </div>
        {studentData && (() => {
          const stageIdx = STAGE_ORDER.indexOf(currentStage);
          const pct = studentData.research_status === 'completed'
            ? 100
            : Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100);
          const completedStages = studentData.research_status === 'completed'
            ? STAGE_ORDER.length
            : stageIdx + 1;
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Registration No.</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{studentData.registration_number}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Program</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{studentData.program}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Research Status</p>
                  <SBadge status={studentData.research_status} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Stage {completedStages} of {STAGE_ORDER.length}</span>
                  <span className="text-sm font-bold" style={{ color: '#1B5E20' }}>{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : '#1B5E20' }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{STAGE_LABELS[currentStage]}</p>
              </div>
            </div>
          );
        })()}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex min-w-max border-b border-gray-200">
              {STAGE_ORDER.map((stageId, idx) => {
                const accessible = tabAccessible(stageId);
                const isActive = activeTab === stageId;
                const status = tabStatus(stageId);
                return (
                  <button key={stageId} onClick={() => handleTabClick(stageId)} disabled={!accessible}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-b-2 text-white' : accessible ? 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50' : 'border-transparent text-gray-300 cursor-not-allowed'}`}
                    style={isActive ? { backgroundColor: '#1B5E20', borderBottomColor: '#FFC107' } : {}}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${status === 'completed' ? 'bg-green-500 text-white' : status === 'current' && isActive ? 'bg-yellow-400 text-green-900' : status === 'current' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-400'}`}>
                      {status === 'completed' ? <CheckCircle className="w-3 h-3" /> : status === 'locked' ? <Lock className="w-3 h-3" /> : idx + 1}
                    </span>
                    <span>{STAGE_LABELS[stageId]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-6">
            {!tabAccessible(activeTab) ? (
              <div className="text-center py-12"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="font-medium text-gray-500">This stage is locked</p><p className="text-sm text-gray-400 mt-1">Complete the previous stages to unlock this one.</p></div>
            ) : renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
