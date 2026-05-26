import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'auditor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    let query = `
      SELECT ac.*, u.name as auditor_name, s.registration_number
      FROM audit_comments ac
      JOIN users u ON ac.auditor_id = u.id
      JOIN students s ON ac.student_id = s.id
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' WHERE ac.student_id = ?';
      params.push(studentId);
    }

    query += ' ORDER BY ac.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ auditComments: rows });
  } catch (error) {
    console.error('Error fetching audit comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'auditor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, comment, riskLevel } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO audit_comments (auditor_id, student_id, comment, risk_level) VALUES (?, ?, ?, ?)',
      [payload.userId, studentId, comment, riskLevel]
    ) as any[];

    return NextResponse.json({ id: result.insertId, message: 'Audit comment added successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error adding audit comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
