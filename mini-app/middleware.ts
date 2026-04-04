// Middleware disabled — auth is handled by the (protected) layout via auth()
// Edge Runtime doesn't support the NextAuth config imports
export default function middleware() {
  // noop
}

export const config = {
  matcher: [],
};
