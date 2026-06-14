import { AppShell } from "@/components/layout/AppShell";
import { AirdropsListClient } from "@/components/airdrops/AirdropsListClient";

export default function AirdropsPage() {
  return (
    <AppShell>
      <AirdropsListClient />
    </AppShell>
  );
}
