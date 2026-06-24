"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  const options: Array<{
    value: "light" | "dark";
    label: string;
    icon: typeof Moon;
    description: string;
  }> = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      description: "Bright background with dark text",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      description: "Dark background with light text",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose how Sourcecery looks to you.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(({ value, label, icon: Icon, description }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                  isActive
                    ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/30"
                    : "border-border hover:border-brand-300 hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}