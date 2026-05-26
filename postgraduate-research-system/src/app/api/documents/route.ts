import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const payload = verifyToken(token || '');
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const stage = searchParams.get('stage');

    let query = 'SELECT * FROM research_documents WHERE 1=1';
    const params: any[] = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }

    query += ' ORDER BY uploaded_at DESC';

    const [rows] = await pool.query(query, params) as any[];

    return NextResponse.json({ documents: rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
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

    const formData = await request.formData();
    const studentId = formData.get('student_id') as string;
    const stage = formData.get('stage') as string;
    const documentTitle = formData.get('document_title') as string;
    const file = formData.get('file') as File;

    if (!studentId || !stage || !documentTitle || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX are allowed.' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${studentId}_${stage}_${timestamp}_${file.name}`;
    const filepath = join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Get latest version number for this student and stage
    const [versionRows] = await pool.query(
      'SELECT MAX(version_number) as max_version FROM research_documents WHERE student_id = ? AND stage = ?',
      [studentId, stage]
    ) as any[];
    const versionNumber = (versionRows[0]?.max_version || 0) + 1;

    // Save to database
    const [result] = await pool.query(
      'INSERT INTO research_documents (student_id, stage, document_title, file_path, version_number) VALUES (?, ?, ?, ?, ?)',
      [studentId, stage, documentTitle, `/uploads/documents/${filename}`, versionNumber]
    ) as any[];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [payload.userId, 'Upload Document', 'Documents', `Uploaded ${stage} document for student ${studentId}`, request.headers.get('x-forwarded-for') || 'unknown']
    );

    return NextResponse.json({ id: result.insertId, message: 'Document uploaded successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
