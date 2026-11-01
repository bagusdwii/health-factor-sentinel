# Health Factor Sentinel

Health Factor Sentinel is an AI agent that monitors a leveraged Venus lending position on BNB Smart Chain testnet (chain 97). It reports whether the position is healthy, at warning, at action level, or liquidatable, and it is built to be hired through the ERC-8183 escrow standard.

**Job:** Health Factor Monitoring.

**Status:** build in progress. The read path (position status) is implemented and typechecks. The on-chain repay action is disabled until the Venus testnet addresses are verified on-chain.

## Live URL

Not deployed yet. This section will list the public HTTPS domain once hosting is live, for example `https://<your-domain>/.well-known/agent-card.json`.

## What it does

- **Reads a position:** calls `getAccountLiquidity` on the Venus Comptroller (Unitroller) to get the account's liquidity and shortfall, in USD with 18 decimals.
- **Classifies it:** `healthy`, `warn` (below the warning threshold), `act` (below the action threshold), or `liquidatable` (shortfall above zero).
- **Sells the check:** serves an A2A endpoint with the skills `negotiate-erc8183-job` (price quote, signed by the agent wallet, valid up to 900 seconds) and `notify_funded`. Funded jobs are picked up by the job watcher, and the result is submitted with `submitResult`.
- **Acts (planned):** when a self-managed loan falls to the action threshold, it repays a small amount of debt from its own wallet. This path is disabled until the addresses are verified.

## Requirements

- Node.js 20 or later
- A funded BSC testnet wallet for for gas, test $U for payments)

## Setup

```bash
npm install
cp .env.example .env
# Fill in AGENT_PRIVATE_KEY and WALLET_PASSWORD in .env. Never commit .env.
npm run build
npm start
```

The server listens on `PORT` (default 3000).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check. Returns `{"ok":true}`. |
| GET | `/.well-known/agent-card.json` | Agent card: name, description, and skills. |
| POST | `/a2a` | Skill calls. Body: `{"skill":"notify_funded","params":{"account":"0x..."}}`. Read-only. |

Unknown skills return HTTP 400.

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `NETWORK` | Must be `bsc-testnet`. |
| `BSC_TESTNET_RPC` | RPC endpoint for chain 97. |
| `AGENT_PRIVATE_KEY` | Agent wallet key. Secret. |
| `WALLET_PASSWORD` | Keystore password for the SDK wallet provider. Secret. |
| `OWNER_ADDRESS` | Campaign wallet that owns the agent registration. |
| `AGENT_PUBLIC_URL` | Public base URL, used in the agent card and job delivery. |
| `ENABATCHER` | Set to `true` to start the ERC-8183 job watcher. |
| `WARN_BELOW_USD`, `ACT_BELOW_USD` | Suggested thresholds in USD (defaults 5 and 2). |

## Network and contracts

- Chain: BNB Smart Chain testnet (97)
- ERC-8004 Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ERC-8183 contracts (from `@bnbagent/sdk` `bsc-testnet` config): AgenticCommerce `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de`, EvaluatorRouter `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25`, OptimisticPolicy `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea`
- Payment token ($U, test): `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`
- Venus testnet (from the official Venus deployment file, pending on-chain verification): Unitroller `0x94d1820b2D1c7c7452A163983Dc888CEC546b77D`, vBNB `0x2E7222e51c0f6e98610A1543Aa3836E092CDe62c`, vUSDT `0xb7526572FFE56AB9D7489838Bf2E18e3323b441A`

## Verification checklist

Before the agent is treated as live:

1. Confirm the Venus addresses on https://testnet.bscscan.com.
2. Call `assess()` against a known test position and check the result on-chain.
3. Enable repay only after the underlying token for vUSDT is read on-chain and approve/repay is tested on testnet.
4. Confirm the agent answers `/health` and `/.well-known/agent-card.json` from the public URL.
5. Confirm the agent has at least five on-chain lending actions on at least three different days, from its own wallet.

## Security notes

- Keys live only in `.env` (ignored by git) or environment variables.
- The agent never signs with the campaign wallet. The campaign wallet only registers the agent.
- Repay amounts are small and fixed by configuration.

## License

MIT
