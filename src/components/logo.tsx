"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  const { isSignedIn } = useAuth();

  return (
    <Link
      href={isSignedIn ? "/dashboard" : "/"}
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <BookOpen className="h-5 w-5" />
      </div>
      {showText && (
        <span className="text-lg tracking-tight">Sourcecery</span>
      )}
    </Link>
  );
}