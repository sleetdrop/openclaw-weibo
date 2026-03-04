import type { z } from "zod";
import type { WeiboConfigSchema, WeiboAccountConfigSchema } from "./config-schema.js";

export type WeiboConfig = z.infer<typeof WeiboConfigSchema>;
export type WeiboAccountConfig = z.infer<typeof WeiboAccountConfigSchema>;

export type ResolvedWeiboAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  name?: string;
  appId?: string;
  appSecret?: string;
  wsEndpoint?: string;
  tokenEndpoint?: string;
  config: WeiboAccountConfig;
};

export type WeiboConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "backoff"
  | "error"
  | "stopped";

export type WeiboDisconnectInfo = {
  code: number;
  reason: string;
  at: number;
};

export type WeiboRuntimeStatusPatch = {
  running?: boolean;
  connected?: boolean;
  connectionState?: WeiboConnectionState;
  reconnectAttempts?: number;
  nextRetryAt?: number | null;
  lastConnectedAt?: number | null;
  lastDisconnect?: WeiboDisconnectInfo | null;
  lastError?: string | null;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastInboundAt?: number | null;
  lastOutboundAt?: number | null;
};

export type WeiboMessageContext = {
  messageId: string;
  senderId: string;
  text: string;
  createTime?: number;
};

export type WeiboSendResult = {
  messageId: string;
  chatId: string;
  chunkId: number;
};
