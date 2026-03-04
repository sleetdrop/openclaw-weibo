import { afterEach, describe, expect, it, vi } from "vitest";
import { clearClientCache, createWeiboClient } from "../client.js";
import type { ResolvedWeiboAccount } from "../types.js";

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

describe("createWeiboClient", () => {
  afterEach(() => {
    clearClientCache();
  });

  it("reuses the cached client when the effective connection config is unchanged", () => {
    const first = createWeiboClient(makeAccount());
    const second = createWeiboClient(makeAccount());

    expect(second).toBe(first);
  });

  it("replaces the cached client when credentials change for the same account", () => {
    const first = createWeiboClient(makeAccount());
    const closeSpy = vi.spyOn(first, "close");

    const second = createWeiboClient(
      makeAccount({
        appSecret: "secret-2",
      }),
    );

    expect(second).not.toBe(first);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("replaces the cached client when endpoints change for the same account", () => {
    const first = createWeiboClient(makeAccount());
    const closeSpy = vi.spyOn(first, "close");

    const second = createWeiboClient(
      makeAccount({
        wsEndpoint: "ws://example.com/next",
      }),
    );

    expect(second).not.toBe(first);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
