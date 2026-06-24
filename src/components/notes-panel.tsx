"use client";

import { useState, useTransition } from "react";
import {
  AudioLines,
  StickyNote,
  Plus,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  createNote,
  deleteNote,
  convertNoteToSource,
  convertAllNotesToSources,
} from "@/app/actions/notes";

export interface Note {
  id: string;
  title: string;
  content: string;
  isSource: boolean;
  createdAt: string;
}

export function NotesPanel({
  notebookId,
  notes: initialNotes,
}: {
  notebookId: string;
  notes: Note[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertingAll, setConvertingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transition, startTransition] = useTransition();

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    startTransition(async () => {
      try {
        const note = await createNote(notebookId, title.trim(), content.trim());
        setNotes((prev) => [
          {
            id: note.id,
            title: note.title,
            content: note.content,
            isSource: note.isSource,
            createdAt: note.createdAt.toISOString(),
          },
          ...prev,
        ]);
        setTitle("");
        setContent("");
        setShowForm(false);
        setMessage(null);
      } catch (err) {
        setMessage((err as Error).message);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      try {
        await deleteNote(noteId, notebookId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch (err) {
        setMessage((err as Error).message);
      }
    });
  };

  const handleConvert = (noteId: string) => {
    setConvertingId(noteId);
    startTransition(async () => {
      try {
        await convertNoteToSource(noteId, notebookId);
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, isSource: true } : n))
        );
        setMessage("Note converted to source!");
      } catch (err) {
        setMessage((err as Error).message);
      } finally {
        setConvertingId(null);
      }
    });
  };

  const handleConvertAll = () => {
    setConvertingAll(true);
    startTransition(async () => {
      try {
        const result = await convertAllNotesToSources(notebookId);
        setNotes((prev) => prev.map((n) => ({ ...n, isSource: true })));
        setMessage(`Converted ${result.converted} notes to sources!`);
      } catch (err) {
        setMessage((err as Error).message);
      } finally {
        setConvertingAll(false);
      }
    });
  };

  const unconvertedCount = notes.filter((n) => !n.isSource).length;

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
        <Button variant="outline" size="sm" className="w-full gap-2" disabled>
          <AudioLines className="h-4 w-4" />
          Coming soon
        </Button>
      </div>

      {/* Notes section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold">Notes</h2>
            {notes.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({notes.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unconvertedCount > 1 && (
              <button
                onClick={handleConvertAll}
                disabled={convertingAll || transition}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
                title="Convert all notes to sources"
              >
                {convertingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-3 w-3" />
                )}
                All to sources
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              <Plus className="h-3 w-3" />
              Add note
            </button>
          </div>
        </div>

        {/* New note form */}
        {showForm && (
          <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-sm"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={4}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!title.trim() || !content.trim() || saving}
                className="gap-1"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setTitle("");
                  setContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <p className="mb-2 text-xs text-green-600">{message}</p>
        )}

        {/* Notes list */}
        {notes.length === 0 && !showForm ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-center">
            <StickyNote className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">
              No notes yet. Add a note or save an AI answer.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight">
                    {note.title}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!note.isSource && (
                      <button
                        onClick={() => handleConvert(note.id)}
                        disabled={convertingId === note.id || transition}
                        className="text-muted-foreground hover:text-brand-600"
                        title="Convert to source"
                      >
                        {convertingId === note.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-muted-foreground hover:text-red-600"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                  {note.content}
                </p>
                {note.isSource && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Converted to source
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}