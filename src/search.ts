import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { WeiboSearchSchema, type WeiboSearchParams } from "./search-schema.js";

// ============ Helpers ============

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ============ API Types ============

/**
 * 微博搜索 API 响应结构
 * API: http://dmtest.api.weibo.com/open/wis/search_by_sid
 */
export type WeiboSearchApiResponse = {
  code: number;
  message: string;
  data: {
    analyzing: boolean;
    completed: boolean;
    msg: string;
    msg_format: string;
    msg_json: string;
    noContent: boolean;
    profile_image_url: string;
    reference_num: number;
    refused: boolean;
    scheme: string;
    status: number;
    status_stage: number;
    version: string;
  };
};

// 保留旧类型以兼容可能的其他 API 格式
export type WeiboSearchStatusItem = {
  id: string;
  mid: string;
  text: string;
  source: string;
  created_at: string;
  user: {
    id: string;
    screen_name: string;
    profile_image_url: string;
    followers_count: number;
    friends_count: number;
    statuses_count: number;
    verified: boolean;
    verified_type: number;
    description: string;
  };
  reposts_count: number;
  comments_count: number;
  attitudes_count: number;
  pic_urls?: Array<{ thumbnail_pic: string }>;
  retweeted_status?: WeiboSearchStatusItem;
};

export type WeiboSearchResponse = {
  statuses: WeiboSearchStatusItem[];
  total_number: number;
  previous_cursor: number;
  next_cursor: number;
};

// ============ Core Functions ============

// 默认搜索端点（不需要认证）
const DEFAULT_SEARCH_ENDPOINT = "http://dmtest.api.weibo.com/open/wis/search_by_sid";
// 默认 SID
const DEFAULT_SID = "v_openclaw_social";

/**
 * 搜索微博内容
 * 使用 SID 方式访问，不需要 OAuth 认证
 */
async function searchWeibo(
  query: string,
  searchEndpoint?: string,
  sid?: string
): Promise<WeiboSearchApiResponse> {
  const endpoint = searchEndpoint || DEFAULT_SEARCH_ENDPOINT;
  const searchSid = sid || DEFAULT_SID;

  const url = new URL(endpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("sid", searchSid);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `微博搜索失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const result = (await response.json()) as WeiboSearchApiResponse;
  return result;
}

/**
 * 格式化搜索结果
 */
function formatSearchResult(result: WeiboSearchApiResponse) {
  if (result.code !== 0) {
    return {
      success: false,
      error: result.message || "搜索失败",
    };
  }

  const data = result.data;

  // 如果没有内容
  if (data.noContent) {
    return {
      success: true,
      completed: data.completed,
      noContent: true,
      message: "没有找到相关内容",
    };
  }

  // 如果被拒绝
  if (data.refused) {
    return {
      success: false,
      error: "搜索请求被拒绝",
    };
  }

  return {
    success: true,
    completed: data.completed,
    analyzing: data.analyzing,
    content: data.msg,
    contentFormat: data.msg_format,
    referenceCount: data.reference_num,
    scheme: data.scheme,
    version: data.version,
  };
}

// ============ Configuration Types ============

export type WeiboSearchConfig = {
  /** 搜索 API 端点，默认为 dmtest.api.weibo.com */
  searchEndpoint?: string;
  /** SID 标识符，默认为 v_openclaw_social */
  sid?: string;
  /** 是否启用搜索工具，默认为 true */
  enabled?: boolean;
};

function getSearchConfig(api: OpenClawPluginApi): WeiboSearchConfig {
  const weiboCfg = api.config?.channels?.weibo as Record<string, unknown> | undefined;
  return {
    searchEndpoint: weiboCfg?.searchEndpoint as string | undefined,
    sid: weiboCfg?.sid as string | undefined,
    enabled: weiboCfg?.searchEnabled !== false,
  };
}

// ============ Tool Registration ============

export function registerWeiboSearchTools(api: OpenClawPluginApi) {
  const searchCfg = getSearchConfig(api);

  // 检查是否禁用了搜索工具
  if (!searchCfg.enabled) {
    api.logger.debug?.("weibo_search: Search tool disabled, skipping registration");
    return;
  }

  api.registerTool(
    () => ({
      name: "weibo_search",
      label: "Weibo Search",
      description:
        "搜索微博内容。返回 AI 生成的搜索结果摘要。不需要认证。",
      parameters: WeiboSearchSchema,
      async execute(_toolCallId, params) {
        const p = params as WeiboSearchParams;
        try {
          const result = await searchWeibo(
            p.query,
            searchCfg.searchEndpoint,
            searchCfg.sid
          );

          return json(formatSearchResult(result));
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    }),
    { name: "weibo_search" }
  );
  api.logger.info?.("weibo_search: Registered weibo_search tool");
}
