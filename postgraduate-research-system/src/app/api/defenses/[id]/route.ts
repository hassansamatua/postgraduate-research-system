import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { result, status } = await request.json();

    await pool.query(
      'UPDATE defenses SET result = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [result, status, id]
    );

    // Update student stage if defense passed
    if (result && result.startsWith('passed')) {
      const [defense] = await pool.query('SELECT student_id, defense_type FROM defenses WHERE id = ?', [id]) as any[];
      if (defense.length > 0) {
        const { student_id, defense_type } = defense[0];
        const nextStage = defense_type === 'proposal' ? 'chapter_4_5' : 'external_review';
        await pool.query(
          'UPDATE students SET current_stage = ?, updated_at = NOW() WHERE id = ?',
          [nextStage, student_id]
        );
      }
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Update Defense Result', 'Defenses', `Updated defense ${id} result to ${result}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ message: 'Defense result updated successfully' });
  } catch (error) {
    console.error('Error updating defense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
