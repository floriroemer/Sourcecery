import Link from "next/link";
import { FileText, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  return (
    <Link
      href={`/notebooks/${id}`}
      className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
          <FileText className="h-5 w-5 text-brand-600" />
        </div>
        <MoreVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
  );
}