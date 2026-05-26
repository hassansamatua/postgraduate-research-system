'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/status-badge';
import { getCookie, decodeToken } from '@/lib/utils';
import { FileText, CheckCircle, Clock, Download } from 'lucide-react';

function ExternalReviewerDashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews'>('dashboard');
  const [user, setUser] = useState({ name: '', role: 'external_reviewer' });
  const [stats, setStats] = useState({
    assignedReviews: 0,
    completedReviews: 0,
    pendingReviews: 0,
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ id: number; studentName: string; marks: string; comments: string; recommendation: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getCookie('token');
        const payload = decodeToken(token || '');
        if (payload) {
          setUser({ name: payload.name, role: payload.role });

          // Fetch external reviews
          const reviewsRes = await fetch(`/api/external-reviews?external_reviewer_id=${payload.userId}`);
          const reviewsData = await reviewsRes.json();
          if (reviewsData.externalReviews) {
            setReviews(reviewsData.externalReviews);
            setStats({
              assignedReviews: reviewsData.externalReviews.length,
              completedReviews: reviewsData.externalReviews.filter((r: any) => r.status === 'submitted').length,
              pendingReviews: reviewsData.externalReviews.filter((r: any) => r.status === 'pending').length,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'dashboard' | 'reviews' | null;
    if (tabParam && ['dashboard', 'reviews'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

    fetchData();
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/external-reviews/${reviewModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks: Number(reviewModal.marks),
          comments: reviewModal.comments,
          recommendation: reviewModal.recommendation,
        }),
      });
      if (res.ok) {
        setReviewModal(null);
        const token = getCookie('token');
        const payload = decodeToken(token || '');
        if (payload) {
          const res2 = await fetch(`/api/external-reviews?external_reviewer_id=${payload.userId}`);
          const d = await res2.json();
          if (d.externalReviews) {
            setReviews(d.externalReviews);
            setStats({
              assignedReviews: d.externalReviews.length,
              completedReviews: d.externalReviews.filter((r: any) => r.status === 'submitted').length,
              pendingReviews: d.externalReviews.filter((r: any) => r.status === 'pending').length,
            });
          }
        }
      }
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <DashboardLayout role="external_reviewer" userName={user.name}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="external_reviewer" userName={user.name}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assigned Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.assignedReviews}</p>
                </div>
                <FileText className="w-12 h-12 text-zu-green" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingReviews}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completedReviews}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Reg. No.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Document</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Recommendation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{review.student_name}</td>
                      <td className="py-3 px-4 text-sm">{review.registration_number}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-zu-green" />
                          <a href={review.document_path} target="_blank" rel="noopener noreferrer" className="text-zu-green hover:underline">
                            Download
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={review.status} />
                      </td>
                      <td className="py-3 px-4">
                        {review.recommendation ? (
                          <StatusBadge status={review.recommendation} />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {review.status === 'pending' ? (
                          <button onClick={() => setReviewModal({ id: review.id, studentName: review.student_name, marks: '', comments: '', recommendation: '' })}
                            className="text-white text-xs px-3 py-1.5 rounded font-medium" style={{backgroundColor:'#1B5E20'}}>
                            Submit Review
                          </button>
                        ) : (
                          <button onClick={() => setReviewModal({ id: review.id, studentName: review.student_name, marks: String(review.marks || ''), comments: review.comments || '', recommendation: review.recommendation || '' })}
                            className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded font-medium hover:bg-gray-200">
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No reviews assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Submit External Review</h3>
            <p className="text-sm text-gray-500 mb-4">{reviewModal.studentName}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marks (out of 100)</label>
                <input type="number" min="0" max="100" value={reviewModal.marks}
                  onChange={e => setReviewModal({...reviewModal, marks: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  placeholder="Enter marks" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea rows={4} value={reviewModal.comments}
                  onChange={e => setReviewModal({...reviewModal, comments: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  placeholder="Provide your detailed review comments..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                <select value={reviewModal.recommendation}
                  onChange={e => setReviewModal({...reviewModal, recommendation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white">
                  <option value="">Select recommendation...</option>
                  <option value="accepted">Accepted</option>
                  <option value="minor_corrections">Minor Corrections</option>
                  <option value="major_corrections">Major Corrections</option>
                  <option value="resubmit">Resubmit</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSubmitReview} disabled={submitting || !reviewModal.marks || !reviewModal.recommendation}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{backgroundColor:'#1B5E20'}}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setReviewModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ExternalReviewerDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>}>
      <ExternalReviewerDashboardContent />
    </Suspense>
  );
}
