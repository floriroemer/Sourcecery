"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FileText, MoreVertical, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deleteNotebook } from "@/app/actions/notebooks";
import { useRouter } from "next/navigation";

export function NotebookCard({
  id,
  title,
  description,
  sourceCount = 0,
  updatedAt,
}: {
  id: string;
  title: string;
  description?: string | null;
  sourceCount?: number;
  updatedAt: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteNotebook(id);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete notebook:", err);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div
      className="group relative block rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <Link href={`/notebooks/${id}`} className="block">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <FileText className="h-5 w-5 text-brand-600" />
          </div>
        </div>

        <h3 className="mt-4 font-semibold leading-tight group-hover:text-brand-700">
          {title}
        </h3>

        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary">{sourceCount} sources</Badge>
          <span>Updated {updatedAt}</span>
        </div>
      </Link>

      {/* 3-dots menu button */}
      <div ref={menuRef} className="absolute right-3 top-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            setConfirmingDelete(false);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-xl">
            <Link
              href={`/notebooks/${id}`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open notebook
            </Link>
            <Link
              href={`/notebooks/${id}`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              {deleting ? (
                <span className="text-red-600">Deleting...</span>
              ) : confirmingDelete ? (
                <span className="font-medium text-red-600">Click again to confirm</span>
              ) : (
                <span className="text-red-600">Delete</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}