import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, facultyId, departmentId, specialization, maxStudents, supervisorType } = await request.json();

    await pool.query(
      'UPDATE supervisors SET user_id = ?, faculty_id = ?, department_id = ?, specialization = ?, max_students = ?, supervisor_type = ? WHERE id = ?',
      [userId, facultyId, departmentId, specialization, maxStudents, supervisorType, id]
    );

    return NextResponse.json({ message: 'Supervisor updated successfully' });
  } catch (error) {
    console.error('Error updating supervisor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await pool.query('DELETE FROM supervisors WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Supervisor deleted successfully' });
  } catch (error) {
    console.error('Error deleting supervisor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
