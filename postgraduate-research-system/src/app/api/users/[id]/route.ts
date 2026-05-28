import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is fetching their own profile or is super_admin
    const isOwnProfile = payload.userId === parseInt(id);
    const isSuperAdmin = payload.role === 'super_admin';
    
    if (!isOwnProfile && !isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, faculty_id, department_id, profile_picture, status FROM users WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is updating their own profile or is super_admin
    const isOwnProfile = payload.userId === parseInt(id);
    const isSuperAdmin = payload.role === 'super_admin';
    
    if (!isOwnProfile && !isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type');
    let name, email, password, role, faculty_id, department_id, status, currentPassword, newPassword, profilePicture, specialization, max_students, registration_number, program;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name') as string;
      currentPassword = formData.get('currentPassword') as string;
      newPassword = formData.get('newPassword') as string;
      profilePicture = formData.get('profilePicture') as File;
    } else {
      const body = await request.json();
      name = body.name;
      email = body.email;
      password = body.password;
      role = body.role;
      faculty_id = body.faculty_id;
      department_id = body.department_id;
      status = body.status;
      profilePicture = body.profilePicture; // URL string
      specialization = body.specialization;
      max_students = body.max_students;
      registration_number = body.registration_number;
      program = body.program;
    }

    // If user is updating their own profile, verify current password for password change
    if (isOwnProfile && newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      
      const [userRows] = await pool.query('SELECT password FROM users WHERE id = ?', [id]) as any[];
      if (userRows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, userRows[0].password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    let query = 'UPDATE users SET name = ?';
    const values: any[] = [name];

    if (isSuperAdmin) {
      query += ', email = ?, role = ?, faculty_id = ?, department_id = ?, status = ?';
      values.push(email, role, faculty_id || null, department_id || null, status || 'active');
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      query += ', password = ?';
      values.push(hashedPassword);
    }

    // Handle profile picture (URL string or file upload)
    if (profilePicture) {
      if (typeof profilePicture === 'string') {
        // It's a URL string from the upload API
        query += ', profile_picture = ?';
        values.push(profilePicture);
      } else if (profilePicture instanceof File) {
        // It's a file (legacy support)
        const bytes = await profilePicture.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${profilePicture.type};base64,${base64}`;
        query += ', profile_picture = ?';
        values.push(dataUrl);
      }
    }

    query += ' WHERE id = ?';
    values.push(id);

    await pool.query(query, values);

    // Handle student record when role changes
    if (isSuperAdmin && role) {
      const [stuRows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [id]) as any[];
      const hasStudentRecord = stuRows.length > 0;

      if (role === 'student' && !hasStudentRecord) {
        const regNum = registration_number || `REG${Date.now()}`;
        const prog = program || 'General Program';
        await pool.query(
          'INSERT INTO students (user_id, registration_number, program, faculty_id, department_id) VALUES (?, ?, ?, ?, ?)',
          [id, regNum, prog, faculty_id || null, department_id || null]
        );
      } else if (role !== 'student' && hasStudentRecord) {
        await pool.query('DELETE FROM students WHERE user_id = ?', [id]);
      } else if (role === 'student' && hasStudentRecord) {
        await pool.query(
          'UPDATE students SET faculty_id = ?, department_id = ? WHERE user_id = ?',
          [faculty_id || null, department_id || null, id]
        );
      }
    }

    // Handle supervisor record when role changes
    if (isSuperAdmin && role) {
      // Check if user has a supervisor record
      const [supRows] = await pool.query('SELECT id FROM supervisors WHERE user_id = ?', [id]) as any[];
      const hasSupervisorRecord = supRows.length > 0;

      if ((role === 'supervisor' || role === 'co_supervisor') && !hasSupervisorRecord) {
        // Create supervisor record if role changed to supervisor/co_supervisor
        const supervisorType = role === 'co_supervisor' ? 'co' : 'main';
        await pool.query(
          'INSERT INTO supervisors (user_id, faculty_id, department_id, specialization, max_students, supervisor_type) VALUES (?, ?, ?, ?, ?, ?)',
          [id, faculty_id || null, department_id || null, specialization || 'General Research', max_students || 5, supervisorType]
        );
      } else if (role !== 'supervisor' && role !== 'co_supervisor' && hasSupervisorRecord) {
        // Delete supervisor record if role changed away from supervisor/co_supervisor
        await pool.query('DELETE FROM supervisors WHERE user_id = ?', [id]);
      } else if ((role === 'supervisor' || role === 'co_supervisor') && hasSupervisorRecord) {
        // Update supervisor record if already exists
        const supervisorType = role === 'co_supervisor' ? 'co' : 'main';
        await pool.query(
          'UPDATE supervisors SET faculty_id = ?, department_id = ?, specialization = ?, max_students = ?, supervisor_type = ? WHERE user_id = ?',
          [faculty_id || null, department_id || null, specialization || 'General Research', max_students || 5, supervisorType, id]
        );
      }
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 400 });
    }
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete supervisor record if exists
    await pool.query('DELETE FROM supervisors WHERE user_id = ?', [id]);
    // Delete student record if exists
    await pool.query('DELETE FROM students WHERE user_id = ?', [id]);
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
