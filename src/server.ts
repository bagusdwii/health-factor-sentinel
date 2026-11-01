// HTTP server for Health Factor Sentinel.
// Serves the agent card at /.well-known/agent-card.json (check 2: discoverable),
// a health check at /health (check 3: live), and an A2A-style endpoint at /a2a
// for the skills negotiate-erc8183-job and notify_funded.
import { createServer } from "node:http";
import { makeNegotiationHandler, startJobWatcher } from "./erc8183";
import { assess } from "./healthFactor";
import { getAddress, isAddress } from "viem";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLenv.AGENT_PUBLIC_URL ?? `http://localhost:${PORT}`;

const agentCard = {
  name: "Health Factor Sentinel",
  description:
    "Health Factor Monitoring agent for Venus lending positions on BNB Smart Chain testnet. It reads a position's liquidity and shortfall from the Venus Comptroller and reports whether it is healthy, at warning, at action level, or liquidatable.",
  url: PUBLIC_URL,
  version: "0.1.0",
  skills: [
    {
      id: "negotiate-erc8183-job",
      name: "Negotiate ERC-8183 job",
      description:
        "Quotes a price for a health-factor check, signed by the agent wallet. Quote is valid for 900 seconds.",
    },
    {
      id: "notify_funded",
      name: "Notify funded job",
      description: "Tells the agent a job has been funded so it can do the health-factor check.",
    },
  ],
};

function send(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", PUBLIC_URL);

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/.well-known/agent-card.json") {
      return send(res, 200, agentCard);
    }

    if (req.method === "POST" && url.pathname === "/a2a") {
      const raw = await readBody(req);
      let body: { skill?: string; params?: Record<string, unknown> };
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: "invalid_json" });
      }

      if (body.skill === "negotiate-erc8183-job") {
        // Quote signing requires the SDK's quote signer; the handler is created
        // here so the price and currency come from config, not from the caller.
        const handler = makeNegotiationHandler();
        return send(res, 200, {
          skill: body.skill,
          handler: handler.constructor.name,
          note: "Quote generation requires the agent wallet. Wire the signer before accepting real jobs.",
        });
      }

      if (body.skill === "notify_funded") {
        const account = String(body.params?.account ?? "");
        if (!isAddress(account)) {
          return send(res, 400, { error: "invalid_account" });
        }
        const a = await assess(getAddress(account));
        return send(res, 200, {
          account: a.account,
          status: a.status,
          liquidityUsd: a.liquidityUsd.toString(),
          shortfallUsd: a.shortfallUsd.toString(),
        });
      }

      return send(res, 400, { error: "unknown_skill" });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    // Keep answering: a probe must get a response, not a crash.
    return send(res, 500, { error: "internal_error", message: String((err as Error).message) });
  }
});

server.listen(PORT, () => {
  console.log(`Health Factor Sentinel listening on ${PORT}`);
});

// Start the funded-job watcher only when explicitly enabled, so the HTTP
// server can run without a funded wallet.
if (process.env.ENABLE_JOB_WATCHER === "true") {
  startJobWatcher().catch((e) => console.error("job watcher stopped:", e));
}
