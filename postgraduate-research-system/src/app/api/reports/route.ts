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

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');

    let data: any = {};

    switch (reportType) {
      case 'student_progress':
        [data.students] = await pool.query(`
          SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name,
                 rt.title, rt.faculty_status, rt.admin_status
          FROM students s
          JOIN users u ON s.user_id = u.id
          JOIN faculties f ON s.faculty_id = f.id
          JOIN departments d ON s.department_id = d.id
          LEFT JOIN research_titles rt ON s.id = rt.student_id
          ORDER BY s.current_stage
        `) as any[];
        break;

      case 'supervisor_workload':
        [data.supervisors] = await pool.query(`
          SELECT s.*, u.name, u.email, f.name as faculty_name, d.name as department_name,
                 COUNT(DISTINCT rt.student_id) as assigned_students
          FROM supervisors s
          JOIN users u ON s.user_id = u.id
          JOIN faculties f ON s.faculty_id = f.id
          JOIN departments d ON s.department_id = d.id
          LEFT JOIN research_titles rt ON s.id = rt.supervisor_id
          GROUP BY s.id
          ORDER BY s.current_students DESC
        `) as any[];
        break;

      case 'faculty_status':
        [data.faculties] = await pool.query(`
          SELECT f.*, 
                 COUNT(DISTINCT s.id) as total_students,
                 SUM(CASE WHEN s.research_status = 'completed' THEN 1 ELSE 0 END) as completed,
                 SUM(CASE WHEN s.research_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
          FROM faculties f
          LEFT JOIN students s ON f.id = s.faculty_id
          GROUP BY f.id
        `) as any[];
        break;

      case 'pending_approvals':
        [data.approvals] = await pool.query(`
          SELECT a.*, s.registration_number, u.name as student_name, a.stage
          FROM approvals a
          JOIN students s ON a.student_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE a.status = 'pending'
          ORDER BY a.created_at DESC
        `) as any[];
        break;

      case 'completed_research':
        [data.completed] = await pool.query(`
          SELECT s.*, u.name, u.email, f.name as faculty_name, rt.title
          FROM students s
          JOIN users u ON s.user_id = u.id
          JOIN faculties f ON s.faculty_id = f.id
          JOIN research_titles rt ON s.id = rt.student_id
          WHERE s.research_status = 'completed'
          ORDER BY s.updated_at DESC
        `) as any[];
        break;

      case 'audit_compliance':
        [data.audit] = await pool.query(`
          SELECT ac.*, s.registration_number, u.name as student_name, aud.name as auditor_name
          FROM audit_comments ac
          JOIN students s ON ac.student_id = s.id
          JOIN users u ON s.user_id = u.id
          JOIN users aud ON ac.auditor_id = aud.id
          WHERE ac.status = 'open'
          ORDER BY ac.risk_level DESC
        `) as any[];
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ reportType, data });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
