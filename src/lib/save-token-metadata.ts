import type { TokenSocialLinks } from "@/lib/token-social";

export async function saveTokenMetadata(params: {
  tokenAddress: string;
  txHash: string;
  description?: string;
  socialLinks?: TokenSocialLinks;
}): Promise<void> {
  const res = await fetch(`/api/tokens/${params.tokenAddress.toLowerCase()}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      txHash: params.txHash,
      description: params.description?.trim() || undefined,
      socialLinks: params.socialLinks,
    }),
  });

  const body = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to save token metadata");
  }
}
