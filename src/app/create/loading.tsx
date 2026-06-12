import { AppShell } from "@/components/layout/AppShell";
import { CreateMemeFormSkeleton } from "@/components/create/CreateMemeFormSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <CreateMemeFormSkeleton />
    </AppShell>
  );
}
