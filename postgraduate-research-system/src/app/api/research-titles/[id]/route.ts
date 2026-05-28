import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { facultyStatus, adminStatus, facultyComments, adminComments } = await request.json();

    let updateFields: string[] = [];
    let updateValues: any[] = [];

    if (facultyStatus && (payload.role === 'faculty' || payload.role === 'admin')) {
      updateFields.push('faculty_status = ?');
      updateValues.push(facultyStatus);
    }
    if (adminStatus && payload.role === 'admin') {
      updateFields.push('admin_status = ?');
      updateValues.push(adminStatus);
      // Sync final_status with admin decision
      updateFields.push('final_status = ?');
      updateValues.push(adminStatus);
    }
    if (facultyComments) {
      updateFields.push('faculty_comments = ?');
      updateValues.push(facultyComments);
    }
    if (adminComments) {
      updateFields.push('admin_comments = ?');
      updateValues.push(adminComments);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updateValues.push(id);
    updateFields.push('updated_at = NOW()');

    await pool.query(
      `UPDATE research_titles SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // If faculty approves, advance student to admin_authorization stage
    if (facultyStatus === 'approved') {
      const [rtRows] = await pool.query('SELECT student_id FROM research_titles WHERE id = ?', [id]) as any[];
      if (rtRows.length > 0) {
        await pool.query(
          'UPDATE students SET current_stage = ?, updated_at = NOW() WHERE id = ?',
          ['admin_authorization', rtRows[0].student_id]
        );
      }
    }

    // If admin authorizes, update student stage to proposal_stage
    if (adminStatus === 'authorized') {
      const [researchTitle] = await pool.query('SELECT student_id FROM research_titles WHERE id = ?', [id]) as any[];
      if (researchTitle.length > 0) {
        await pool.query(
          'UPDATE students SET current_stage = ?, updated_at = NOW() WHERE id = ?',
          ['proposal_stage', researchTitle[0].student_id]
        );
        // Create notification for student
        await pool.query(
          'INSERT INTO notifications (user_id, title, message, type) SELECT u.id, ?, ?, ? FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
          ['Research Title Authorized', 'Your research title has been authorized by admin. You can now proceed to the Proposal Stage.', 'success', researchTitle[0].student_id]
        );
      }
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Update Research Title', 'Research Titles', `Updated research title ${id}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ message: 'Research title updated successfully' });
  } catch (error) {
    console.error('Error updating research title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
