import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const stage = searchParams.get('stage');

    let query = `
      SELECT a.*, u.name as approver_name, s.registration_number
      FROM approvals a
      JOIN users u ON a.approved_by = u.id
      JOIN students s ON a.student_id = s.id
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' WHERE a.student_id = ?';
      params.push(studentId);
    }
    if (stage) {
      query += (studentId ? ' AND' : ' WHERE') + ' a.stage = ?';
      params.push(stage);
    }

    query += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ approvals: rows });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, stage, status, comments } = await request.json();

    const approverRole = payload.role as string;
    if (!['faculty', 'supervisor', 'admin'].includes(approverRole)) {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 401 });
    }

    // Check if supervisor is a co-supervisor - they cannot create approvals
    if (approverRole === 'supervisor') {
      const [supRows] = await pool.query(
        'SELECT supervisor_type FROM supervisors WHERE user_id = ?',
        [payload.userId]
      ) as any[];
      if (supRows.length > 0 && supRows[0].supervisor_type === 'co') {
        return NextResponse.json({ error: 'Co-supervisors cannot approve or reject documents. Only main supervisors can approve.' }, { status: 403 });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO approvals (student_id, stage, approved_by, approver_role, status, comments, approved_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [studentId, stage, payload.userId, approverRole, status, comments]
    ) as any[];

    // Update student stage based on approval
    if (status === 'approved') {
      const stageMap: Record<string, string> = {
        'proposal': 'proposal_defense',
        'chapter_4': 'chapter_5',
        'chapter_5': 'final_report',
        'final_report': 'final_defense',
        'proposal_defense': 'chapter_4_5',
        'final_defense': 'external_review',
      };

      if (stageMap[stage]) {
        await pool.query(
          'UPDATE students SET current_stage = ?, updated_at = NOW() WHERE id = ?',
          [stageMap[stage], studentId]
        );
      }
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Add Approval', 'Approvals', `Approved ${stage} for student ${studentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Approval recorded successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
