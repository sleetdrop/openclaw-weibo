import type { ResolvedWeiboAccount } from "./types.js";

function normalizePart(value: unknown): string {
  return String(value ?? "").trim();
}

export function getWeiboConnectionFingerprint(account: ResolvedWeiboAccount): string {
  return JSON.stringify({
    appId: normalizePart(account.appId),
    appSecret: normalizePart(account.appSecret),
    wsEndpoint: normalizePart(account.wsEndpoint),
    tokenEndpoint: normalizePart(account.tokenEndpoint),
  });
}

export function getWeiboTokenFingerprint(
  account: ResolvedWeiboAccount,
  tokenEndpoint?: string,
): string {
  return JSON.stringify({
    appId: normalizePart(account.appId),
    appSecret: normalizePart(account.appSecret),
    tokenEndpoint: normalizePart(tokenEndpoint ?? account.tokenEndpoint),
  });
}
