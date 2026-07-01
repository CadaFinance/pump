/** Dev-only guest wallet bypass — also on deploy when PUMP_ENABLE_GUEST_AUTH=true. */
export function isGuestAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;

  const flag = process.env.PUMP_ENABLE_GUEST_AUTH?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
