import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['supervisor', 'faculty'].includes(payload.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if supervisor is a co-supervisor - they cannot change document status
    if (payload.role === 'supervisor') {
      const [supRows] = await pool.query(
        'SELECT supervisor_type FROM supervisors WHERE user_id = ?',
        [payload.userId]
      ) as any[];
      if (supRows.length > 0 && supRows[0].supervisor_type === 'co') {
        return NextResponse.json({ error: 'Co-supervisors cannot change document status. Only main supervisors can approve/reject.' }, { status: 403 });
      }
    }

    await pool.query(
      'UPDATE research_documents SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Update Document Status', 'Documents', `Updated document ${id} status to ${status}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ message: 'Document status updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
