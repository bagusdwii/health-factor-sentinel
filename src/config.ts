// Configuration for Health Factor Sentinel (BNB Smart Chain testnet, chain 97). from environment variables only.
// Venus addresses come from the official Venus testnet deployment file
// (VenusProtocol/venus-protocol, deployments/bsctestnet.json). They are NOT yet
// verified on-chain; verification must pass before any position is opened.

export const CHAIN_ID = 97;
export const RPC_URL =
  process.env.BSC_TESTNET_RPC ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545";

export const VENUS = {
  unitroller: "0x94d1820b2D1c7c7452A163983Dc888CEC546b77D" as const,
  vBNB: "0x2E7222e51c0f6e98610A1543Aa3836E092CDe62c" as const,
  vUSDT: "0xb7526572FFE56AB9D7489838Bf2E18e3323b441A" as const,
  verified: false,
};

// Test $U token used as the ERC-8183 payment token (from the campaign brief).
export const PAYMENT_TOKEN_U = "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as const;

// Suggested default thresholds in Comptroller liquidity units (USD, 18 decimals).
// These are proposed defaults for the user to confirm, not market data.
export const THRESHOLDS = {
  warnBelowUsd: BigInt(process.env.WARN_BELOW_USD ?? "5") * 10n ** 18n,
  actBelowUsd: BigInt(process.env.ACT_BELOW_USD ?? "2") * 10n ** 18n,
};

// Suggested job price: 0.05 $U (18 decimals). Confirm the token decimals on-chain before use.
export const JOB_PRICE_U_BASE_UNITS = 50000000000000000n;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}
