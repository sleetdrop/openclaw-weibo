import { describe, expect, it } from "vitest";
import { getLatestCredentialFromState, getSimPageEndpoints } from "../sim-page.js";

describe("getLatestCredentialFromState", () => {
  it("returns latest credential when state has credentials", () => {
    const result = getLatestCredentialFromState({
      credentials: [
        { appId: "old-app", appSecret: "old-secret", createdAt: 1 },
        { appId: "new-app", appSecret: "new-secret", createdAt: 2 },
      ],
    });

    expect(result).toEqual({ appId: "new-app", appSecret: "new-secret" });
  });

  it("returns null when state has no credential", () => {
    expect(getLatestCredentialFromState({ credentials: [] })).toBeNull();
    expect(getLatestCredentialFromState({})).toBeNull();
  });
});

describe("getSimPageEndpoints", () => {
  it("builds token and ws urls from page origin", () => {
    const result = getSimPageEndpoints({
      pageOrigin: "http://10.0.0.2:9810",
      wsPort: 9999,
    });

    expect(result.tokenUrl).toBe("http://10.0.0.2:9810/open/auth/ws_token");
    expect(result.wsUrl).toBe("ws://10.0.0.2:9999/ws/stream");
  });

  it("uses wss for https pages", () => {
    const result = getSimPageEndpoints({
      pageOrigin: "https://demo.example.com:9810",
      wsPort: 9999,
    });

    expect(result.wsUrl).toBe("wss://demo.example.com:9999/ws/stream");
  });
});
