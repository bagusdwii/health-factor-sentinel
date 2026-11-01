// ERC-8183 or Sentinel.
// Uses the SDK's NegotiationHandler for price quotes and the funded-job watcher
// to pick up escrowed jobs. The job work itself is a health-factor check; the
// on-chain repay path stays disabled until Venus addresses are verified.
import { EVMWalletProvider } from "@bnbagent/sdk";
import { LocalStorageProvider } from "@bnbagent/sdk/storage";
import { ERC8183JobOps, NegotiationHandler, fundedJobWatcher } from "@bnbagent/sdk/erc8183";
import { JOB_PRICE_U_BASE_UNITS, PAYMENT_TOKEN_U, requireEnv } from "./config";
import { assess } from "./healthFactor";

// Quote price is in base units of the payment token. The decimals of test $U
// are not yet confirmed on-chain, so this value is a suggested default.
export function makeNegotiationHandler() {
  return new NegotiationHandler({
    servicePrice: JOB_PRICE_U_BASE_UNITS.toString(),
    currency: PAYMENT_TOKEN_U,
    quoteTtlSeconds: 900,
    chainId: 97,
  });
}

// Parses the account to check from a job description. The buyer must supply an
// EVM address for the position to monitor. Anything else is rejected.
export function parseAdescription: string): `0x${string}` | null {
  const m = description.match(/0x[a-fA-F0-9]{40}/);
  return m ? (m[0] as `0x${string}`) : null;
}

// Watches jobs funded to the agent and submits a result within the dispute window.
// The brief requires submitResult within 30 minutes of the job being opened.
export async function startJobWatcher(): Promise<void> {
  const walletProvider = new EVMWalletProvider({
    password: requireEnv("WALLET_PASSWORD"),
    privateKey: requireEnv("AGENT_PRIVATE_KEY"),
    persist: false,
  });
  const jobOps = await ERC8183JobOps.create({
    walletProvider,
    network: "bsc-testnet",
    storageProvider: new LocalStorageProvider(".agent-data"),
    servicePrice: BigInt(JOB_PRICE_U_BASE_UNITS),
    agentUrl: process.env.AGENT_PUBLIC_URL,
  });

  await fundedJobWatcher(
    jobOps,
    async (job) => {
      const jobId = Number(job.jobId);
      const description = String(job.description ?? "");
      const account = parseAccountFromDescription(description);

      if (!account) {
        const r = await jobOps.submitResult(
          jobId,
          "Rejected: no valid EVM address found in the job description.",
          { status: "rejected" },
        );
        return { retry: r.retryable === true }; await assess(account);
      const payload = {
        ...a,
        liquidityUsd: a.liquidityUsd.toString(),
        shortfallUsd: a.shortfallUsd.toString(),
      };
      const r = await jobOps.submitResult(jobId, JSON.stringify(payload), {
        model: "health-factor-sentinel-v1",
      });
      return { retry: r.retryable === true };
    },
    { interval: 30 },
  );
}

// Used by the A2A endpoint for the notify_funded skill.
export function requireOwnerAddress(): string {
  return requireEnv("OWNER_ADDRESS");
}
