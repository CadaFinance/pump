import { AppShell } from "@/components/layout/AppShell";
import { CreateMemeForm } from "@/components/create/CreateMemeForm";

export default function CreatePage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="section-heading">Launch a meme</h2>
          <p className="mt-1 text-body-sm text-pump-muted">
            Issue a new token on the bonding curve with a required initial buy.
          </p>
        </div>

        <CreateMemeForm />
      </div>
    </AppShell>
  );
}
