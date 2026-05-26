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
    const facultyId = searchParams.get('faculty_id');

    let query = `
      SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      JOIN faculties f ON s.faculty_id = f.id
      JOIN departments d ON s.department_id = d.id
      WHERE s.status = 'active'
    `;
    const params: any[] = [];

    if (facultyId) {
      query += ' AND s.faculty_id = ?';
      params.push(facultyId);
    }

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ supervisors: rows });
  } catch (error) {
    console.error('Error fetching supervisors:', error);
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

    const { userId, facultyId, departmentId, specialization, maxStudents, supervisorType } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO supervisors (user_id, faculty_id, department_id, specialization, max_students, supervisor_type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, facultyId, departmentId, specialization, maxStudents, supervisorType]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Create Supervisor', 'Supervisors', `Created supervisor for user ${userId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Supervisor created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating supervisor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
