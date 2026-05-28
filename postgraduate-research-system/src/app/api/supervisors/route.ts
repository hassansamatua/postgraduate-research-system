import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');
    const departmentId = searchParams.get('department_id');
    const userId = searchParams.get('user_id');

    let query = `
      SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name,
        (SELECT COUNT(*) FROM research_titles rt
         WHERE (rt.supervisor_id = s.id OR rt.co_supervisor_id = s.id)
           AND rt.admin_status != 'rejected') AS current_students
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN faculties f ON s.faculty_id = f.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.status = 'active'
    `;
    const params: any[] = [];

    if (userId) {
      query += ' AND s.user_id = ?';
      params.push(userId);
    } else if (facultyId) {
      query += ' AND s.faculty_id = ?';
      params.push(facultyId);
      if (departmentId) {
        query += ' AND s.department_id = ?';
        params.push(departmentId);
      }
    }

    query += ' ORDER BY s.faculty_id, u.name';

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

    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, facultyId, departmentId, specialization, maxStudents, supervisorType } = await request.json();

    // Check if supervisor already exists for this user
    const [existing] = await pool.query('SELECT id FROM supervisors WHERE user_id = ?', [userId]) as any[];
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Supervisor already exists for this user' }, { status: 400 });
    }

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
