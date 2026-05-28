'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow border border-gray-100 max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">You do not have permission to access this page.</p>
        <button
          onClick={() => router.back()}
          className="w-full text-white py-2.5 rounded-lg font-medium hover:opacity-90"
          style={{ backgroundColor: '#1B5E20' }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
