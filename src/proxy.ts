import { auth } from "@/auth";

export default auth((request) => {
  const isLoggedIn = !!request.auth;
  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  // Not logged in â†’ authentication pages only
  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(
      new URL("/login", request.url)
    );
  }

  // Already logged in â†’ don't show login/register again
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(
      new URL("/", request.url)
    );
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)",
  ],
};

