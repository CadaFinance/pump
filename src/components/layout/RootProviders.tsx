"use client";

import { CreatorFollowsProvider } from "@/components/creators/CreatorFollowsProvider";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import { AirdropSavesProvider } from "@/components/airdrops/AirdropSavesProvider";
import { UserAvatarProvider } from "@/components/user/UserAvatarProvider";
import { UserBootstrapProvider } from "@/components/user/UserBootstrapProvider";
import { ReferralCaptureProvider } from "@/components/referrals/ReferralCaptureProvider";
import { RouteWarmup } from "@/components/layout/RouteWarmup";
import { Web3Provider } from "@/components/wallet/Web3Provider";

/** Sync provider tree — wallet cookies hydrate client-side (no root Suspense flash). */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <UserBootstrapProvider>
        <FavoritesProvider>
          <AirdropSavesProvider>
            <CreatorFollowsProvider>
              <UserAvatarProvider>
                <ReferralCaptureProvider>
                  <RouteWarmup />
                  {children}
                </ReferralCaptureProvider>
              </UserAvatarProvider>
            </CreatorFollowsProvider>
          </AirdropSavesProvider>
        </FavoritesProvider>
      </UserBootstrapProvider>
    </Web3Provider>
  );
}
