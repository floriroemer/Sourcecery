"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Check, Loader2, Bot, Search, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_ENABLED_MODELS } from "@/lib/models";
import { supportsPdfInput } from "@/lib/model-registry";
import {
  updateEnabledModels,
  getAvailableModels,
  refreshModelCache,
} from "@/app/actions/settings";

interface GatewayModel {
  id: string;
  name: string;
  description?: string | null;
  provider: string;
  pricing?: {
    input: string;
    output: string;
  } | null;
}

export function ModelSettings({ initialEnabled }: { initialEnabled: string[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabled));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transition, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [allModels, setAllModels] = useState<GatewayModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all available models from the gateway on mount
  useEffect(() => {
    getAvailableModels().then((models) => {
      setAllModels(models as GatewayModel[]);
      setLoading(false);
    });
  }, []);

  // Filter models by search query
  const filteredModels = useMemo(() => {
    if (!search.trim()) return allModels;
    const lower = search.toLowerCase();
    return allModels.filter(
      (m) =>
        m.id.toLowerCase().includes(lower) ||
        m.name.toLowerCase().includes(lower) ||
        m.provider.toLowerCase().includes(lower)
    );
  }, [allModels, search]);

  // Group filtered models by LLM creator (extracted from model ID prefix, e.g. "anthropic/..." -> "Anthropic")
  const modelsByCreator = useMemo(() => {
    const groups: Record<string, GatewayModel[]> = {};
    for (const m of filteredModels) {
      // Extract creator from the model ID (e.g. "anthropic/claude-sonnet-4.5" -> "Anthropic")
      const creator = m.id.split("/")[0]?.replace(/^\w/, (c) => c.toUpperCase()) ?? "Other";
      if (!groups[creator]) groups[creator] = [];
      groups[creator].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredModels]);

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_ENABLED_MODELS) {
          setMessage(`You can enable at most ${MAX_ENABLED_MODELS} models`);
          return prev;
        }
        next.add(id);
      }
      setMessage(null);
      return next;
    });
  };

  const handleSave = () => {
    setSaving(true);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateEnabledModels(Array.from(enabled));
        setMessage("Saved! Your model selection is now active.");
      } catch (err) {
        setMessage((err as Error).message || "Failed to save");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const models = await refreshModelCache();
      setAllModels(models as GatewayModel[]);
      setMessage("Model list refreshed from Vercel AI Gateway.");
    } catch {
      setMessage("Failed to refresh model list.");
    } finally {
      setRefreshing(false);
    }
  };

  const hasChanges =
    new Set(initialEnabled).size !== enabled.size ||
    !Array.from(initialEnabled).every((id) => enabled.has(id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand-600" />
              AI Models
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Enable up to {MAX_ENABLED_MODELS} models from{" "}
              {allModels.length || "..."} available. Search to find models.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {enabled.size}/{MAX_ENABLED_MODELS} enabled
            </Badge>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Refresh model list"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, provider, or ID..."
            className="pl-9"
          />
        </div>

        {/* Model list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading {allModels.length || ""} models from AI Gateway...
            </span>
          </div>
        ) : filteredModels.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No models found matching &quot;{search}&quot;.
          </p>
        ) : (
          <div className="max-h-[500px] space-y-4 overflow-y-auto">
            {modelsByCreator.map(([creator, models]) => (
              <div key={creator}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {creator}{" "}
                  <span className="text-muted-foreground/60">
                    ({models.length})
                  </span>
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {models.map((model) => {
                    const isEnabled = enabled.has(model.id);
                    const disabled =
                      !isEnabled && enabled.size >= MAX_ENABLED_MODELS;
                    const pdfCapable = supportsPdfInput(model.id);
                    return (
                      <button
                        key={model.id}
                        onClick={() => toggle(model.id)}
                        disabled={disabled}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                          isEnabled
                            ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800"
                            : disabled
                              ? "cursor-not-allowed border-border bg-muted/50 opacity-50"
                              : "border-border hover:border-brand-300 hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isEnabled
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-border"
                          }`}
                        >
                          {isEnabled && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {model.name}
                            </span>
                            {pdfCapable && (
                              <FileText
                                className="h-3 w-3 shrink-0 text-brand-500"
                                aria-label="Supports direct PDF input"
                              />
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {model.id}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PDF capability legend */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3 text-brand-500" />
          <span>= Supports direct PDF input (no docling needed)</span>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.startsWith("Saved") || message.startsWith("Model list")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || transition}
            className="gap-2"
          >
            {(saving || transition) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
          {hasChanges && (
            <button
              onClick={() => {
                setEnabled(new Set(initialEnabled));
                setMessage(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}