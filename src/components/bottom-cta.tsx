"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function BottomCta() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <Link href="/dashboard" className="mt-8 inline-block">
        <Button size="lg" className="gap-2">
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/sign-up" className="mt-8 inline-block">
      <Button size="lg" className="gap-2">
        Get started free
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}