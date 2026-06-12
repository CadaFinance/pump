import { TokenDetailShell } from "@/components/token/TokenDetailShell";

type PageProps = { params: Promise<{ address: string }> };

export default async function TokenDetailPage({ params }: PageProps) {
  const { address } = await params;
  return <TokenDetailShell address={address} />;
}
