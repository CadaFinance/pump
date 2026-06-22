import type { Metadata } from "next";
import { OAuthAuthCompleteClient } from "./OAuthAuthCompleteClient";

export const metadata: Metadata = {
  title: "Sign in · Pump",
};

export default function OAuthAuthCompletePage() {
  return <OAuthAuthCompleteClient />;
}
