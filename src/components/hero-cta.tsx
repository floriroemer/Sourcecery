"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function HeroCta() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link href="/sign-up">
        <Button size="lg" className="gap-2">
          Get started free
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link href="/sign-in">
        <Button size="lg" variant="outline">
          Sign in
        </Button>
      </Link>
    </div>
  );
}