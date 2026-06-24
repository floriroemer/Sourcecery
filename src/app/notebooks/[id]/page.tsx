import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNotebookWithSources } from "@/app/actions/notebooks";
import { getEnabledModels, getAvailableModels } from "@/app/actions/settings";
import {
  getConversations,
  createConversationRender,
  getConversationWithMessages,
} from "@/app/actions/conversations";
import { SourceList } from "@/components/source-list";
import { ChatPanel } from "@/components/chat-panel";
import { NotesPanel } from "@/components/notes-panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c: conversationIdParam } = await searchParams;
  const data = await getNotebookWithSources(id);

  if (!data) notFound();

  const { notebook, sources } = data;
  const enabledModels = await getEnabledModels();
  const allGatewayModels = await getAvailableModels();
  const conversations = await getConversations(notebook.id);

  // Build model info for the enabled models (label, provider from gateway)
  const enabledModelInfos = enabledModels
    .map((id) => {
      const gm = allGatewayModels.find((m) => m.id === id);
      return gm
        ? { id: gm.id, label: gm.name, provider: gm.provider }
        : { id, label: id, provider: "unknown" };
    });

  // Determine the active conversation
  let activeConversationId = conversationIdParam ?? conversations[0]?.id ?? "";

  // If no conversations exist, create one (render-safe, no revalidatePath)
  if (!activeConversationId) {
    const newConvo = await createConversationRender(notebook.id);
    activeConversationId = newConvo.id;
  }

  // Load messages for the active conversation
  let initialMessages: { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[] = [];
  if (activeConversationId) {
    const convoData = await getConversationWithMessages(
      activeConversationId,
      notebook.id
    );
    if (convoData) {
      initialMessages = convoData.messages;
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              {notebook.title}
            </h1>
            {notebook.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {notebook.description}
              </p>
            )}
          </div>
        </div>
        <Badge variant="secondary">{sources.length} sources</Badge>
      </header>

      {/* 3-pane workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sources */}
        <div className="w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
          <SourceList notebookId={notebook.id} sources={sources} />
        </div>

        {/* Center: Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            key={activeConversationId}
            notebookId={notebook.id}
            enabledModels={enabledModelInfos}
            conversations={conversations.map((c) => ({
              id: c.id,
              title: c.title,
              createdAt: c.createdAt.toISOString(),
              updatedAt: c.updatedAt.toISOString(),
            }))}
            activeConversationId={activeConversationId}
            initialMessages={initialMessages}
          />
        </div>

        {/* Right: Notes / Audio */}
        <div className="hidden w-80 shrink-0 border-l border-border bg-card overflow-y-auto lg:block">
          <NotesPanel />
        </div>
      </div>
    </div>
  );
}