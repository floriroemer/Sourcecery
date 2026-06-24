"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_MODELS, MAX_ENABLED_MODELS } from "@/lib/models";
import { updateEnabledModels } from "@/app/actions/settings";

// Group models by provider for display
const PROVIDER_ORDER = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Meta",
  "z.ai",
  "Moonshot",
  "DeepSeek",
  "Alibaba",
  "Mistral",
  "xAI",
  "Perplexity",
  "Amazon",
];

const modelsByProvider = PROVIDER_ORDER.map((provider) => ({
  provider,
  models: ALL_MODELS.filter((m) => m.provider === provider),
})).filter((g) => g.models.length > 0);

export function ModelSettings({ initialEnabled }: { initialEnabled: string[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabled));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transition, startTransition] = useTransition();

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
              Enable up to {MAX_ENABLED_MODELS} models to use in your notebooks.
            </p>
          </div>
          <Badge variant="secondary">
            {enabled.size}/{MAX_ENABLED_MODELS} enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {modelsByProvider.map(({ provider, models }) => (
          <div key={provider}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {provider}
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {models.map((model) => {
                const isEnabled = enabled.has(model.id);
                const disabled = !isEnabled && enabled.size >= MAX_ENABLED_MODELS;
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
                      <div className="truncate text-sm font-medium">
                        {model.label}
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

        {message && (
          <p
            className={`text-sm ${
              message.startsWith("Saved")
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