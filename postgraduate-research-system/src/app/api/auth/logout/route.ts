import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        await pool.query(
          'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
          [payload.userId, 'Logout', 'Authentication', 'User logged out', request.headers.get('x-forwarded-for') || 'unknown']
        );
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
