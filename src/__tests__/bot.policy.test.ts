import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import { handleWeiboMessage } from "../bot.js";

const resolveWeiboAccountMock = vi.hoisted(() => vi.fn());
const getWeiboRuntimeMock = vi.hoisted(() => vi.fn());

vi.mock("../accounts.js", () => ({
  resolveWeiboAccount: resolveWeiboAccountMock,
}));

vi.mock("../runtime.js", () => ({
  getWeiboRuntime: getWeiboRuntimeMock,
}));

function makeRuntime() {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

function makeEvent(fromUserId: string, messageId: string) {
  return {
    type: "message" as const,
    payload: {
      messageId,
      fromUserId,
      text: "hello",
      timestamp: Date.now(),
    },
  };
}

describe("handleWeiboMessage dmPolicy enforcement", () => {
  beforeEach(() => {
    resolveWeiboAccountMock.mockReset();
    getWeiboRuntimeMock.mockReset();

    getWeiboRuntimeMock.mockReturnValue({
      channel: {
        routing: {
          resolveAgentRoute: () => ({
            agentId: "agent-1",
            sessionKey: "session-1",
            accountId: "default",
          }),
        },
        reply: {
          formatInboundEnvelope: ({ body }: { body?: string }) => body ?? "",
          finalizeInboundContext: (ctx: unknown) => ctx,
          createReplyDispatcherWithTyping: ({ deliver }: { deliver: (reply: { text?: string }) => Promise<void> }) => ({
            dispatcher: { deliver },
            replyOptions: {},
            markDispatchIdle: () => undefined,
          }),
          dispatchReplyFromConfig: async (_: unknown) => ({ queuedFinal: false, counts: { final: 0 } }),
        },
        text: {
          resolveTextChunkLimit: () => 4000,
          resolveChunkMode: () => "newline",
          chunkTextWithMode: (text: string) => [text],
        },
      },
      system: {
        enqueueSystemEvent: () => undefined,
      },
    });
  });

  it("accepts all DMs when dmPolicy is open", async () => {
    resolveWeiboAccountMock.mockReturnValue({
      accountId: "default",
      enabled: true,
      configured: true,
      config: { dmPolicy: "open", allowFrom: [], chunkMode: "newline" },
    });

    const result = await handleWeiboMessage({
      cfg: {} as ClawdbotConfig,
      accountId: "default",
      event: makeEvent("unknown_user", "msg_open_1"),
      runtime: makeRuntime() as never,
    });

    expect(result).not.toBeNull();
    expect(result?.senderId).toBe("unknown_user");
  });

  it("accepts DMs from allowed users when dmPolicy is pairing", async () => {
    resolveWeiboAccountMock.mockReturnValue({
      accountId: "default",
      enabled: true,
      configured: true,
      config: { dmPolicy: "pairing", allowFrom: ["allowed_user"], chunkMode: "newline" },
    });

    const result = await handleWeiboMessage({
      cfg: {} as ClawdbotConfig,
      accountId: "default",
      event: makeEvent("allowed_user", "msg_pairing_allowed"),
      runtime: makeRuntime() as never,
    });

    expect(result).not.toBeNull();
    expect(result?.senderId).toBe("allowed_user");
  });

  it("rejects DMs from non-allowed users when dmPolicy is pairing", async () => {
    const runtime = makeRuntime();
    resolveWeiboAccountMock.mockReturnValue({
      accountId: "default",
      enabled: true,
      configured: true,
      config: { dmPolicy: "pairing", allowFrom: ["allowed_user"], chunkMode: "newline" },
    });

    const result = await handleWeiboMessage({
      cfg: {} as ClawdbotConfig,
      accountId: "default",
      event: makeEvent("blocked_user", "msg_pairing_blocked"),
      runtime: runtime as never,
    });

    expect(result).toBeNull();
    expect(runtime.log).toHaveBeenCalledWith(
      expect.stringContaining("rejected DM from blocked_user"),
    );
  });

  it("rejects all DMs when dmPolicy is pairing and allowFrom is empty", async () => {
    const runtime = makeRuntime();
    resolveWeiboAccountMock.mockReturnValue({
      accountId: "default",
      enabled: true,
      configured: true,
      config: { dmPolicy: "pairing", allowFrom: [], chunkMode: "newline" },
    });

    const result = await handleWeiboMessage({
      cfg: {} as ClawdbotConfig,
      accountId: "default",
      event: makeEvent("any_user", "msg_pairing_empty"),
      runtime: runtime as never,
    });

    expect(result).toBeNull();
  });

  it("accepts DMs from any user when dmPolicy is pairing and allowFrom contains wildcard", async () => {
    resolveWeiboAccountMock.mockReturnValue({
      accountId: "default",
      enabled: true,
      configured: true,
      config: { dmPolicy: "pairing", allowFrom: ["*"], chunkMode: "newline" },
    });

    const result = await handleWeiboMessage({
      cfg: {} as ClawdbotConfig,
      accountId: "default",
      event: makeEvent("any_user", "msg_pairing_wildcard"),
      runtime: makeRuntime() as never,
    });

    expect(result).not.toBeNull();
  });
});
