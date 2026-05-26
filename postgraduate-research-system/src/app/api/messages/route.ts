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
    const userId = searchParams.get('user_id');
    const studentId = searchParams.get('student_id');

    let query = `
      SELECT m.*, sender.name as sender_name, receiver.name as receiver_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
    `;
    const params: any[] = [];

    if (userId) {
      query += ' WHERE (m.sender_id = ? OR m.receiver_id = ?)';
      params.push(userId, userId);
    }
    if (studentId) {
      query += (userId ? ' AND' : ' WHERE') + ' m.student_id = ?';
      params.push(studentId);
    }

    query += ' ORDER BY m.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ messages: rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
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

    const { receiverId, studentId, message, attachment } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, student_id, message, attachment) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, receiverId, studentId, message, attachment]
    ) as any[];

    return NextResponse.json({ id: result.insertId, message: 'Message sent successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
