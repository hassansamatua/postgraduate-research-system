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

    const [rows] = await pool.query('SELECT * FROM faculties ORDER BY name ASC') as any[];
    return NextResponse.json({ faculties: rows });
  } catch (error) {
    console.error('Error fetching faculties:', error);
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

    const { name, abbreviation } = await request.json();

    const [result] = await pool.query(
      'INSERT INTO faculties (name, abbreviation) VALUES (?, ?)',
      [name, abbreviation]
    ) as any[];

    return NextResponse.json({ id: result.insertId, message: 'Faculty created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating faculty:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
