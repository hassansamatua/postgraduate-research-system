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
    const externalReviewerId = searchParams.get('external_reviewer_id');

    let query = `
      SELECT er.*, s.registration_number, u.name as student_name, rd.file_path as document_path
      FROM external_reviews er
      JOIN students s ON er.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN research_documents rd ON er.document_id = rd.id
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' WHERE er.student_id = ?';
      params.push(studentId);
    }
    if (externalReviewerId) {
      query += (studentId ? ' AND' : ' WHERE') + ' er.external_reviewer_id = ?';
      params.push(externalReviewerId);
    }

    query += ' ORDER BY er.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ externalReviews: rows });
  } catch (error) {
    console.error('Error fetching external reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, externalReviewerId, documentId } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO external_reviews (student_id, external_reviewer_id, document_id) VALUES (?, ?, ?)',
      [studentId, externalReviewerId, documentId]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Assign External Reviewer', 'External Reviews', `Assigned external reviewer for student ${studentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'External reviewer assigned successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error assigning external reviewer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
