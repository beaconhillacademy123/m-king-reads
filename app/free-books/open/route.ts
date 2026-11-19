import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.replace(/\D/g, '') ?? '';
  return NextResponse.redirect(new URL(id ? `/free-books/${id}` : '/free-books', url.origin));
}
