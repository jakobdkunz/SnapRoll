import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { accessToken } = await withAuth();
    if (!accessToken) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }
    return NextResponse.json({ accessToken });
  } catch (error) {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
}
