type SimStateLike = {
  credentials?: Array<{
    appId?: unknown;
    appSecret?: unknown;
    createdAt?: unknown;
  }>;
};

export type LatestCredential = {
  appId: string;
  appSecret: string;
};

export type SimPageEndpoints = {
  tokenUrl: string;
  wsUrl: string;
};

export function getLatestCredentialFromState(state: SimStateLike): LatestCredential | null {
  const credentials = Array.isArray(state.credentials) ? state.credentials : [];
  if (credentials.length === 0) {
    return null;
  }

  const sorted = [...credentials].sort((a, b) => {
    const aTs = typeof a.createdAt === "number" ? a.createdAt : 0;
    const bTs = typeof b.createdAt === "number" ? b.createdAt : 0;
    return bTs - aTs;
  });

  const first = sorted[0];
  const appId = String(first?.appId ?? "").trim();
  const appSecret = String(first?.appSecret ?? "").trim();

  if (!appId || !appSecret) {
    return null;
  }

  return { appId, appSecret };
}

export function getSimPageEndpoints({
  pageOrigin,
  wsPort,
}: {
  pageOrigin: string;
  wsPort: number;
}): SimPageEndpoints {
  const origin = new URL(pageOrigin);
  const wsProtocol = origin.protocol === "https:" ? "wss:" : "ws:";
  const tokenUrl = new URL("/open/auth/ws_token", origin).toString();
  const wsUrl = `${wsProtocol}//${origin.hostname}:${wsPort}/ws/stream`;

  return {
    tokenUrl,
    wsUrl,
  };
}
