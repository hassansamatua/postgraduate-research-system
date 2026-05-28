'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect based on role
      const redirectMap: Record<string, string> = {
        super_admin: '/dashboard/super-admin',
        admin: '/dashboard/admin',
        student: '/dashboard/student',
        faculty: '/dashboard/faculty',
        supervisor: '/dashboard/supervisor',
        auditor: '/dashboard/auditor',
        external_reviewer: '/dashboard/external-reviewer',
      };

      const redirectPath = redirectMap[data.user.role] || '/dashboard/admin';
      router.push(redirectPath);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/logo.png" alt="Zanzibar University Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-bold" style={{color:'#1B5E20'}}>Zanzibar University</h1>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Postgraduate Research System
          </h2>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            style={{backgroundColor:'#1B5E20'}}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">
            Demo Credentials:
          </p>
          <div className="space-y-2 text-xs text-gray-500">
            <p>Super Admin: superadmin@research.test / password123</p>
            <p>Admin: admin@research.test / password123</p>
            <p>Student: student@research.test / password123</p>
            <p>Faculty: faculty@research.test / password123</p>
            <p>Supervisor: supervisor@research.test / password123</p>
            <p>Auditor: auditor@research.test / password123</p>
            <p>External Reviewer: reviewer@research.test / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
