import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelSettings } from "@/components/model-settings";
import { getEnabledModels } from "@/app/actions/settings";

export default async function SettingsPage() {
  const { userId } = await auth();
  const enabledModels = await getEnabledModels();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and preferences.
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Clerk user ID
              </span>
              <code className="rounded bg-muted px-2 py-1 text-xs">
                {userId}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="secondary">Free</Badge>
            </div>
          </CardContent>
        </Card>

        <ModelSettings initialEnabled={enabledModels} />
      </div>
    </div>
  );
}