import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedWeiboAccount } from "../types.js";
import { clearClientCache, createWeiboClient } from "../client.js";
import { WeiboTokenFetchError } from "../token.js";

const getValidTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../token.js", async () => {
  const actual = await vi.importActual<typeof import("../token.js")>("../token.js");
  return {
    ...actual,
    getValidToken: getValidTokenMock,
  };
});

function makeAccount(overrides: Partial<ResolvedWeiboAccount> = {}): ResolvedWeiboAccount {
  return {
    accountId: "default",
    enabled: true,
    configured: true,
    appId: "app-1",
    appSecret: "secret-1",
    wsEndpoint: "ws://example.com/ws",
    tokenEndpoint: "https://example.com/token",
    config: {},
    ...overrides,
  } as ResolvedWeiboAccount;
}

describe("WeiboWebSocketClient token fetch errors", () => {
  afterEach(() => {
    clearClientCache();
    vi.clearAllMocks();
  });

  it("formats token fetch failures for settings status", async () => {
    const statusHandler = vi.fn();
    getValidTokenMock.mockRejectedValue(
      new WeiboTokenFetchError("Failed to fetch token: 401 Unauthorized", {
        retryable: false,
        status: 401,
      }),
    );

    const client = createWeiboClient(makeAccount(), {
      autoReconnect: false,
      onStatus: statusHandler,
    });

    await expect(client.connect()).rejects.toThrow(/401 Unauthorized/);

    expect(statusHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        running: true,
        connected: false,
        connectionState: "error",
        lastError: expect.stringContaining("获取 token 失败"),
      }),
    );
  });

  it("does not schedule reconnect backoff for non-retryable token failures", async () => {
    const statusHandler = vi.fn();
    getValidTokenMock.mockRejectedValue(
      new WeiboTokenFetchError("Failed to fetch token: 401 Unauthorized", {
        retryable: false,
        status: 401,
      }),
    );

    const client = createWeiboClient(makeAccount(), {
      autoReconnect: true,
      onStatus: statusHandler,
    });

    await expect(client.connect()).rejects.toThrow(/401 Unauthorized/);

    expect(statusHandler).not.toHaveBeenCalledWith(
      expect.objectContaining({
        connectionState: "backoff",
      }),
    );
  });
});
