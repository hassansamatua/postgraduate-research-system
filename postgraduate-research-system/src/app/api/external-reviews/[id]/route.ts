import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'external_reviewer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { marks, comments, recommendation, reviewFile } = await request.json();

    await pool.query(
      'UPDATE external_reviews SET marks = ?, comments = ?, recommendation = ?, review_file = ?, status = ?, submitted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [marks, comments, recommendation, reviewFile, 'submitted', id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Submit External Review', 'External Reviews', `Submitted external review ${id}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ message: 'External review submitted successfully' });
  } catch (error) {
    console.error('Error submitting external review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
