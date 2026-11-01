import { createPublicClient, http, parseAbi, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import { RPC_URL, VENUS, THRESHOLDS } from "./config";

// Venus Comptroller (Unitroller) exposes Compound-style liquidity queries.
const comptrollerAbi = parseAbi([
  "function getAccountLiquidity(address account) view returns (uint256 err, uint256 liquidity, uint256 shortfall)",
]);

export type Status = "healthy" | "warn" | "act" | "liquidatable";

export type Assessment = {
  account: Address;
  liquidityUsd: bigint; // 18 decimals
  shortfallUsd: bigint; // 18 decimals
  status: Status;
};

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(RPC_URL),
});

// Read-only: reports the account's liquidity and shortfall from the Venus Comptroller.
export async function assess(account: Address): Promise<Assessment> {
  const [err, liquidity, shortfall] = (await publicClient.readContract({
    address: VENUS.unitroller,
    abi: comptrollerAbi,
    functionName: "getAccountLiquidity",
    args: [account],
  })) as readonly [bigint, bigint, bigint];
  if (err !== 0n) {
    throw new Error(`Comptroller returned error code ${err}`);
  }

  let status: Status = "healthy";
  if (shortfall > 0n) status = "liquidatable";
  else if (liquidity < THRESHOLDS.actBelowUsd) status = "act";
  else if (liquidity < THRESHOLDS.warnBelowUsd) status = "warn";

  return { account, liquidityUsd: liquidity, shortfallUsd: shortfall, status };
}

// Repay path is intentionally not wired yet. It needs the vUSDT underlying token
// address read on-chain (vUSDT.underlying()) and verified, plus approve and
// repayBorrow calls. Until Venus addresses are verified, this throws so no
// transaction can be sent.
export async function repayIfNeeded(a: Assessment): Promise<never> {
  if (a.status !== "act" && a.status !== "liquidatable") {
    throw new Error(`No action needed: status is ${a.status}`);
  }
  throw new Error(
    "Repay not enabled: Venus testnet addresses are unverified on-chain. Verify, then wire approve + repayBorrow.",
  );
}
