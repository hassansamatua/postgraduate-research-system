import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = `
      SELECT u.*, f.name as faculty_name, d.name as department_name
      FROM users u
      LEFT JOIN faculties f ON u.faculty_id = f.id
      LEFT JOIN departments d ON u.department_id = d.id
    `;
    const params: any[] = [];
    if (role) {
      query += ' WHERE u.role = ?';
      params.push(role);
    }
    query += ' ORDER BY u.name ASC';

    const [rows] = await pool.query(query, params) as any[];
    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, password, role, faculty_id, department_id, specialization, max_students, registration_number, program } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password and role are required' }, { status: 400 });
    }
    if ((role === 'student' || role === 'supervisor' || role === 'co_supervisor') && (!faculty_id || !department_id)) {
      return NextResponse.json({ error: 'Faculty and department are required for this role' }, { status: 400 });
    }
    if (role === 'student' && !registration_number) {
      return NextResponse.json({ error: 'Registration number is required for students' }, { status: 400 });
    }
    if (role === 'student' && !program) {
      return NextResponse.json({ error: 'Program is required for students' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, faculty_id, department_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, faculty_id || null, department_id || null]
    ) as any[];

    const userId = result.insertId;

    // Auto-create supervisor record if role is supervisor or co_supervisor
    if (role === 'supervisor' || role === 'co_supervisor') {
      const supervisorType = role === 'co_supervisor' ? 'co' : 'main';
      await pool.query(
        'INSERT INTO supervisors (user_id, faculty_id, department_id, specialization, max_students, supervisor_type) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, faculty_id || null, department_id || null, specialization || 'General Research', max_students || 5, supervisorType]
      );
    }

    // Auto-create student record if role is student
    if (role === 'student') {
      const regNum = registration_number || `REG${Date.now()}`;
      const prog = program || 'General Program';
      await pool.query(
        'INSERT INTO students (user_id, registration_number, program, faculty_id, department_id) VALUES (?, ?, ?, ?, ?)',
        [userId, regNum, prog, faculty_id || null, department_id || null]
      );
    }

    return NextResponse.json({ id: userId, message: 'User created successfully' }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 400 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
