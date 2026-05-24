export { default } from 'next-auth/middleware'

export const config = {
  // Protect the dashboard and project pages.
  // API routes do their own auth checks (so they can return JSON 401s).
  matcher: ['/', '/projects/:path*'],
}
