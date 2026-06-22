import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/notebooks(.*)",
]);

/**
 * Next.js 16 uses proxy.ts (Node runtime) instead of middleware.ts (Edge).
 * Clerk's clerkMiddleware() is compatible with both.
 */
export default clerkMiddleware((auth, request: NextRequest) => {
  if (isProtectedRoute(request)) {
    auth.protect();
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