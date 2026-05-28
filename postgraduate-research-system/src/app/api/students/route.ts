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

    const [rows] = await pool.query(`
      SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN faculties f ON s.faculty_id = f.id
      LEFT JOIN departments d ON s.department_id = d.id
    `) as any[];

    return NextResponse.json({ students: rows });
  } catch (error) {
    console.error('Error fetching students:', error);
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

    const { userId, registrationNumber, program, facultyId, departmentId } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO students (user_id, registration_number, program, faculty_id, department_id) VALUES (?, ?, ?, ?, ?)',
      [userId, registrationNumber, program, facultyId, departmentId]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Create Student', 'Students', `Created student with registration ${registrationNumber}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Student created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
