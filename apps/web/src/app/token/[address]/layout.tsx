import { TokenDetailRouteLayout } from "@/components/token/TokenDetailRouteLayout";

type TokenDetailLayoutProps = {
  children: React.ReactNode;
};

/** Sync layout — pair switches stay client-side (no RSC suspend / remount). */
export default function TokenDetailLayout({ children }: TokenDetailLayoutProps) {
  return <TokenDetailRouteLayout>{children}</TokenDetailRouteLayout>;
}
