import { maxUint256 } from "viem";
import { contracts, pumpChain } from "@/config/chain";
import { bondingCurveManagerAbi } from "@/lib/bonding-curve";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { CallPolicyVersion, toCallPolicy, toTimestampPolicy } from "@zerodev/permissions/policies";
import type { Policy } from "@zerodev/permissions";

const SESSION_DAYS = 7;

function requireContractAddress(label: string, address: string | undefined): `0x${string}` {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    throw new Error(`${label} contract address is not configured for ${pumpChain.name}.`);
  }
  return address as `0x${string}`;
}

export function buildPumpSessionPolicies(): Policy[] {
  const bondingCurveManager = requireContractAddress(
    "BondingCurveManager",
    contracts.bondingCurveManager
  );
  const memeFactory = requireContractAddress("MemeFactory", contracts.memeFactory);

  const validUntil = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;

  const callPolicy = toCallPolicy({
    policyVersion: CallPolicyVersion.V0_0_5,
    permissions: [
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "buy",
        valueLimit: maxUint256,
      },
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "buyWithReferrer",
        valueLimit: maxUint256,
      },
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "sell",
      },
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "sellWithReferrer",
      },
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "sellWithPermit",
      },
      {
        target: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "sellWithReferrerAndPermit",
      },
      {
        target: memeFactory,
        abi: memeFactoryAbi,
        functionName: "createMeme",
      },
    ],
  });

  const timestampPolicy = toTimestampPolicy({
    validUntil,
  });

  // Gas + rate-limit policies removed — they caused AA23 when misconfigured (wei budget)
  // or when stale policy data was embedded in serialized session approvals.
  return [callPolicy, timestampPolicy];
}
