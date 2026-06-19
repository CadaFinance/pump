export const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID ?? "";

export function isZeroDevConfigured(): boolean {
  return Boolean(zeroDevProjectId && zeroDevProjectId !== "CHANGE_ME");
}
