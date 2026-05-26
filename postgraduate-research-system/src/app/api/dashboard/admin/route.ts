import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [[totalStudents]] = await pool.query(
      'SELECT COUNT(*) as count FROM students'
    ) as any;

    const [[pendingFacultyReview]] = await pool.query(
      "SELECT COUNT(*) as count FROM research_titles WHERE faculty_status = 'pending'"
    ) as any;

    const [[pendingAuthorization]] = await pool.query(
      "SELECT COUNT(*) as count FROM research_titles WHERE faculty_status = 'approved' AND admin_status = 'pending'"
    ) as any;

    const [[pendingProposalDefenses]] = await pool.query(
      "SELECT COUNT(*) as count FROM defenses WHERE defense_type = 'proposal' AND status = 'scheduled'"
    ) as any;

    const [[pendingFinalDefenses]] = await pool.query(
      "SELECT COUNT(*) as count FROM defenses WHERE defense_type = 'final' AND status = 'scheduled'"
    ) as any;

    const [[pendingExternalReviews]] = await pool.query(
      "SELECT COUNT(*) as count FROM external_reviews WHERE status = 'pending'"
    ) as any;

    const [[completedResearch]] = await pool.query(
      "SELECT COUNT(*) as count FROM students WHERE research_status = 'completed'"
    ) as any;

    const [pendingTitles] = await pool.query(`
      SELECT rt.id, rt.title, rt.research_area, rt.faculty_status, rt.admin_status,
             rt.faculty_comments, rt.admin_comments, rt.submitted_at,
             u.name as student_name, s.registration_number, s.program,
             sup_u.name as supervisor_name, sup.specialization as supervisor_specialization
      FROM research_titles rt
      JOIN students s ON rt.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN supervisors sup ON rt.supervisor_id = sup.id
      LEFT JOIN users sup_u ON sup.user_id = sup_u.id
      WHERE rt.admin_status = 'pending'
      ORDER BY rt.submitted_at DESC
    `) as any[];

    const [students] = await pool.query(`
      SELECT s.id, s.registration_number, s.program, s.research_status, s.current_stage,
             u.name, u.email,
             f.name as faculty_name, d.name as department_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN faculties f ON s.faculty_id = f.id
      JOIN departments d ON s.department_id = d.id
      ORDER BY s.created_at DESC
    `) as any[];

    const [recentLogs] = await pool.query(`
      SELECT al.id, al.action, al.module, al.description, al.created_at,
             u.name as user_name, u.role
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `) as any[];

    return NextResponse.json({
      stats: {
        totalStudents: totalStudents.count,
        pendingFacultyReview: pendingFacultyReview.count,
        pendingAuthorization: pendingAuthorization.count,
        pendingProposalDefenses: pendingProposalDefenses.count,
        pendingFinalDefenses: pendingFinalDefenses.count,
        pendingExternalReviews: pendingExternalReviews.count,
        completedResearch: completedResearch.count,
      },
      pendingTitles,
      students,
      recentLogs,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
