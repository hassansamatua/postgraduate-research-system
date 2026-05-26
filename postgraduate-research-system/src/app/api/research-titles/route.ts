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
    const facultyId = searchParams.get('faculty_id');

    let query = `
      SELECT rt.*, s.registration_number, s.program, s.faculty_id,
             u.name as student_name,
             sup_u.name as supervisor_name, sup.specialization as supervisor_specialization,
             cosup_u.name as co_supervisor_name
      FROM research_titles rt
      JOIN students s ON rt.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN supervisors sup ON rt.supervisor_id = sup.id
      LEFT JOIN users sup_u ON sup.user_id = sup_u.id
      LEFT JOIN supervisors cosup ON rt.co_supervisor_id = cosup.id
      LEFT JOIN users cosup_u ON cosup.user_id = cosup_u.id
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' WHERE rt.student_id = ?';
      params.push(studentId);
    } else if (facultyId) {
      query += ' WHERE s.faculty_id = ?';
      params.push(facultyId);
    }

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ researchTitles: rows });
  } catch (error) {
    console.error('Error fetching research titles:', error);
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

    const { studentId, title, description, researchArea, supervisorId, coSupervisorId } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO research_titles (student_id, title, description, research_area, supervisor_id, co_supervisor_id, submitted_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [studentId, title, description, researchArea, supervisorId, coSupervisorId]
    ) as any[];

    // Update student current stage
    await pool.query(
      'UPDATE students SET current_stage = ?, research_status = ?, updated_at = NOW() WHERE id = ?',
      ['title_proposal', 'in_progress', studentId]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Submit Research Title', 'Research Titles', `Submitted research title for student ${studentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Research title submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating research title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
