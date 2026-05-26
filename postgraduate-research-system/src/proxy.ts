import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');

  const publicPaths = ['/login', '/api/auth/login'];

  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control
  const protectedPaths = {
    '/dashboard/super-admin': ['super_admin'],
    '/dashboard/admin': ['admin'],
    '/dashboard/student': ['student'],
    '/dashboard/faculty': ['faculty'],
    '/dashboard/supervisor': ['supervisor'],
    '/dashboard/auditor': ['auditor'],
    '/dashboard/external-reviewer': ['external_reviewer'],
  };

  for (const [path, allowedRoles] of Object.entries(protectedPaths)) {
    if (request.nextUrl.pathname.startsWith(path)) {
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
