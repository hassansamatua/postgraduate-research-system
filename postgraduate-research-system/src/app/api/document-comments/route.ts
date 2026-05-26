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
    const documentId = searchParams.get('document_id');

    let query = `
      SELECT dc.*, u.name as commenter_name, u.role as commenter_role
      FROM document_comments dc
      JOIN users u ON dc.user_id = u.id
    `;
    const params: any[] = [];

    if (documentId) {
      query += ' WHERE dc.document_id = ?';
      params.push(documentId);
    }

    query += ' ORDER BY dc.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ comments: rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
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

    const { documentId, comment, commentType } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO document_comments (document_id, user_id, comment, comment_type) VALUES (?, ?, ?, ?)',
      [documentId, payload.userId, comment, commentType]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Add Comment', 'Document Comments', `Added comment to document ${documentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Comment added successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
