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
    const defenseType = searchParams.get('defense_type');

    let query = `
      SELECT d.*, s.registration_number, u.name as student_name, u.name as created_by_name
      FROM defenses d
      JOIN students s ON d.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN users cb ON d.created_by = cb.id
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' WHERE d.student_id = ?';
      params.push(studentId);
    }
    if (defenseType) {
      query += (studentId ? ' AND' : ' WHERE') + ' d.defense_type = ?';
      params.push(defenseType);
    }

    query += ' ORDER BY d.date DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ defenses: rows });
  } catch (error) {
    console.error('Error fetching defenses:', error);
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

    const { studentId, defenseType, date, time, venue, panelMembers, remarks } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO defenses (student_id, defense_type, date, time, venue, panel_members, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [studentId, defenseType, date, time, venue, panelMembers, remarks, payload.userId]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Schedule Defense', 'Defenses', `Scheduled ${defenseType} defense for student ${studentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Defense scheduled successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error scheduling defense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
