import { AppShell } from "@/components/layout/AppShell";
import { PageBackLink } from "@/components/ui/PageBackLink";
import { CreateAirdropForm } from "@/components/airdrops/CreateAirdropForm";
import { AirdropGuaranteeExplainer } from "@/components/airdrops/AirdropGuaranteeExplainer";

type PageProps = {
  searchParams: Promise<{ token?: string; name?: string; symbol?: string }>;
};

export default async function CreateAirdropPage({ searchParams }: PageProps) {
  const { token, name, symbol } = await searchParams;

  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <PageBackLink href="/airdrops" />
        <AirdropGuaranteeExplainer />
        <CreateAirdropForm
          initialLinkedToken={token}
          initialLinkedTokenName={name}
          initialLinkedTokenSymbol={symbol}
        />
      </div>
    </AppShell>
  );
}
