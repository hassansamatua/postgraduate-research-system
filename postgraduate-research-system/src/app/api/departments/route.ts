import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');

    let query = `
      SELECT d.*, f.name as faculty_name
      FROM departments d
      JOIN faculties f ON d.faculty_id = f.id
    `;
    const params: any[] = [];

    if (facultyId) {
      query += ' WHERE d.faculty_id = ?';
      params.push(facultyId);
    }

    query += ' ORDER BY d.name ASC';

    const [rows] = await pool.query(query, params) as any[];
    return NextResponse.json({ departments: rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
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

    const { faculty_id, name } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO departments (faculty_id, name) VALUES (?, ?)',
      [faculty_id, name]
    ) as any[];

    return NextResponse.json({ id: result.insertId, message: 'Department created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
