import { AppShell } from "@/components/layout/AppShell";
import { CreateMemeForm } from "@/components/create/CreateMemeForm";
import { SectionHeadingIcon } from "@/components/ui/IconLabel";
import { MetricIcons } from "@/lib/metric-icons";

export default function CreatePage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <SectionHeadingIcon icon={MetricIcons.launch}>Launch a meme</SectionHeadingIcon>
          <p className="mt-1 text-body-sm text-pump-muted">
            Issue a new token on the bonding curve with a required initial buy.
          </p>
        </div>

        <CreateMemeForm />
      </div>
    </AppShell>
  );
}
