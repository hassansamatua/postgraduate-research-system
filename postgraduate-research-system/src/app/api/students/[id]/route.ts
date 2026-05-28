import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const [rows] = await pool.query(`
      SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN faculties f ON s.faculty_id = f.id
      JOIN departments d ON s.department_id = d.id
      WHERE s.id = ?
    `, [id]) as any[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student: rows[0] });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { program, facultyId, departmentId, researchStatus, currentStage } = body;

    const fields: string[] = [];
    const values: any[] = [];
    if (program !== undefined)       { fields.push('program = ?');         values.push(program); }
    if (facultyId !== undefined)     { fields.push('faculty_id = ?');      values.push(facultyId); }
    if (departmentId !== undefined)  { fields.push('department_id = ?');   values.push(departmentId); }
    if (researchStatus !== undefined){ fields.push('research_status = ?'); values.push(researchStatus); }
    if (currentStage !== undefined)  { fields.push('current_stage = ?');   values.push(currentStage); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await pool.query(
      `UPDATE students SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Delete ALL messages for this student when research is completed
    if (researchStatus === 'completed' || currentStage === 'completion') {
      // Fetch the student's user_id so we can match sender/receiver
      const [studentRows] = await pool.query('SELECT user_id FROM students WHERE id = ?', [id]) as any[];
      if (studentRows.length > 0) {
        const studentUserId = studentRows[0].user_id;
        // Delete by student_id (stored by student side) AND by sender/receiver (stored by supervisor side)
        await pool.query(
          'DELETE FROM messages WHERE student_id = ? OR sender_id = ? OR receiver_id = ?',
          [id, studentUserId, studentUserId]
        );
      }
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Update Student', 'Students', `Updated student ${id}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
