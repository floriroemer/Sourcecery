"use client";

import { AudioLines, StickyNote, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotesPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Audio overview section */}
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold">Audio overview</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Generate a podcast-style audio summary of your sources.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled
        >
          <AudioLines className="h-4 w-4" />
          Coming soon
        </Button>
      </div>

      {/* Notes section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold">Notes</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Saved notes and key insights will appear here.
        </p>

        <div className="mt-4 space-y-2">
          {/* Placeholder for future notes */}
          <div className="rounded-lg border border-dashed border-border p-3 text-center">
            <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">
              No notes yet. Chat with your sources to generate insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}