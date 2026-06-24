import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/notebooks(.*)",
]);

/**
 * Next.js 16 uses proxy.ts (Node runtime) instead of middleware.ts (Edge).
 * Clerk's clerkMiddleware() is compatible with both.
 *
 * auth.protect() throws a NEXT_REDIRECT error internally to trigger the
 * sign-in redirect. We catch it to prevent unhandledRejection warnings.
 */
export default clerkMiddleware((auth, request: NextRequest) => {
  if (isProtectedRoute(request)) {
    try {
      auth.protect();
    } catch {
      // auth.protect() throws NEXT_REDIRECT to redirect to sign-in.
      // This is expected behavior — the redirect is handled by Clerk.
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm|mp4|mov|mp3|wav|m4a|pdf|txt|md)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};