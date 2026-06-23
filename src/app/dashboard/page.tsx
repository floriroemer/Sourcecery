import Link from "next/link";
import { BookOpen, Plus, FileText } from "lucide-react";
import { getNotebooks } from "@/app/actions/notebooks";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const notebooks = await getNotebooks();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your notebooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notebooks.length === 0
              ? "Get started by creating your first notebook."
              : `${notebooks.length} notebook${notebooks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New notebook
          </Button>
        </Link>
      </div>

      {notebooks.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <BookOpen className="h-7 w-7 text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold">No notebooks yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a notebook to upload sources, chat with your documents, and
            generate insights.
          </p>
          <Link href="/dashboard/new" className="mt-6">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first notebook
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              id={notebook.id}
              title={notebook.title}
              description={notebook.description}
              sourceCount={notebook.sourceCount}
              updatedAt={formatDate(notebook.updatedAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}