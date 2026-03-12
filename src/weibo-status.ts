import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type, type Static } from "@sinclair/typebox";

// ============ Schema ============

export const WeiboStatusSchema = Type.Object({
  count: Type.Optional(
    Type.Number({
      description: "每页数量，最大 25，默认 20",
      minimum: 1,
      maximum: 25,
    })
  ),
  page: Type.Optional(
    Type.Number({
      description: "页码，默认为 1",
      minimum: 1,
    })
  ),
  screen_name: Type.Optional(
    Type.String({
      description: "用户昵称（可选）",
    })
  ),
  start_time: Type.Optional(
    Type.Number({
      description: "返回发博时间比 start_time 大的微博（Unix 时间戳，秒）",
    })
  ),
  end_time: Type.Optional(
    Type.Number({
      description: "返回发博时间小于或等于 end_time 的微博（Unix 时间戳，秒）",
    })
  ),
  stat_date: Type.Optional(
    Type.String({
      description: "指定发博月份，格式 yyyyMM",
      pattern: "^\\d{6}$",
    })
  ),
  feature: Type.Optional(
    Type.Number({
      description: "过滤类型：0-全部，1-原创，2-图片，3-视频等",
      enum: [0, 1, 2, 3],
    })
  ),
  visible: Type.Optional(
    Type.Number({
      description: "可见性：0-全部，1-所有人可见，2-仅自己可见等",
      enum: [0, 1, 2],
    })
  ),
  trim_user: Type.Optional(
    Type.Number({
      description: "user 字段开关：0-完整，1-仅 uid",
      enum: [0, 1],
    })
  ),
  fetch_data_only: Type.Optional(
    Type.Number({
      description: "是否仅获取数据：1-不记录曝光日志",
      enum: [0, 1],
    })
  ),
});

export type WeiboStatusParams = Static<typeof WeiboStatusSchema>;

// ============ Helpers ============

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ============ API Types ============

/**
 * 用户信息结构
 */
export type WeiboStatusUser = {
  id: number;
  idstr?: string;
  screen_name: string;
  name?: string;
  description?: string;
  profile_image_url?: string;
  cover_image_phone?: string;
  followers_count_str?: string;
  friends_count?: number;
  statuses_count?: number;
  credit_score?: number;
  created_at?: string;
  verified_reason?: string;
  verified_detail?: {
    data?: Array<{
      sub_key: number;
      weight: number;
      key: number;
      desc: string;
    }>;
    custom?: number;
  };
  status_total_counter?: {
    total_cnt: number;
    repost_cnt: number;
    comment_like_cnt: number;
    like_cnt: number;
    comment_cnt: number;
  };
  follow_me?: boolean;
  remark?: string;
  vvip?: number;
  svip?: number;
  is_big?: number;
  chaohua_ability?: number;
};

/**
 * 可见性结构
 */
export type WeiboStatusVisible = {
  type: number;
  list_id: number;
};

/**
 * 微博状态项结构
 */
export type WeiboStatusItem = {
  id: number;
  mid: string;
  text: string;
  source: string;
  created_at: string;
  region_name?: string;
  pic_ids?: string[];
  pic_num?: number;
  thumbnail_pic?: string;
  bmiddle_pic?: string;
  original_pic?: string;
  visible?: WeiboStatusVisible;
  user?: WeiboStatusUser;
  retweeted_status?: WeiboStatusItem;
  more_info_type?: number;
  number_display_strategy?: {
    apply_scenario_flag: number;
    display_text_min_number: number;
    display_text: string;
  };
};

/**
 * 用户微博 API 响应结构
 * API: http://open-im.api.weibo.com/open/weibo/user_status
 */
export type WeiboStatusApiResponse = {
  code: number;
  message: string;
  data: {
    statuses: WeiboStatusItem[];
    total_number: number;
  };
};

// ============ Token Management ============

// Token 过期时间：2小时（7200秒），提前60秒刷新
const TOKEN_EXPIRE_SECONDS = 7200;
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

// 默认 token 端点
const DEFAULT_TOKEN_ENDPOINT = "http://open-im.api.weibo.com/open/auth/ws_token";

type WeiboStatusTokenCache = {
  token: string;
  acquiredAt: number;
  expiresIn: number;
};

// 专用的 token 缓存
let weiboStatusTokenCache: WeiboStatusTokenCache | null = null;

type TokenResponse = {
  data: {
    token: string;
    expire_in: number;
  };
};

/**
 * 获取 token
 * 通过 http://open-im.api.weibo.com/open/auth/ws_token 获取
 * token 过期时间为 2 小时
 */
async function fetchWeiboStatusToken(
  appId: string,
  appSecret: string,
  tokenEndpoint?: string
): Promise<WeiboStatusTokenCache> {
  const endpoint = tokenEndpoint || DEFAULT_TOKEN_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `获取 token 失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const result = (await response.json()) as TokenResponse;

  if (!result.data?.token) {
    throw new Error("获取 token 失败: 响应中缺少 token");
  }

  const tokenCache: WeiboStatusTokenCache = {
    token: result.data.token,
    acquiredAt: Date.now(),
    expiresIn: result.data.expire_in || TOKEN_EXPIRE_SECONDS,
  };

  weiboStatusTokenCache = tokenCache;
  return tokenCache;
}

/**
 * 获取有效的 token
 * 如果缓存的 token 未过期则返回缓存，否则重新获取
 */
async function getValidWeiboStatusToken(
  appId: string,
  appSecret: string,
  tokenEndpoint?: string
): Promise<string> {
  // 检查缓存的 token 是否有效
  if (weiboStatusTokenCache) {
    const expiresAt =
      weiboStatusTokenCache.acquiredAt +
      weiboStatusTokenCache.expiresIn * 1000 -
      TOKEN_REFRESH_BUFFER_SECONDS * 1000;
    if (Date.now() < expiresAt) {
      return weiboStatusTokenCache.token;
    }
  }

  // 获取新 token
  const tokenResult = await fetchWeiboStatusToken(appId, appSecret, tokenEndpoint);
  return tokenResult.token;
}

// ============ Core Functions ============

// 默认端点
const DEFAULT_WEIBO_STATUS_ENDPOINT = "http://open-im.api.weibo.com/open/weibo/user_status";

/**
 * 获取用户自己发布的微博请求参数
 */
type FetchWeiboStatusOptions = {
  token: string;
  count?: number;
  page?: number;
  screenName?: string;
  startTime?: number;
  endTime?: number;
  statDate?: string;
  feature?: number;
  visible?: number;
  trimUser?: number;
  fetchDataOnly?: number;
  endpoint?: string;
};

/**
 * 获取用户自己发布的微博
 * 使用 token 认证方式访问
 */
async function fetchWeiboStatus(
  options: FetchWeiboStatusOptions
): Promise<WeiboStatusApiResponse> {
  const apiEndpoint = options.endpoint || DEFAULT_WEIBO_STATUS_ENDPOINT;

  const url = new URL(apiEndpoint);
  url.searchParams.set("token", options.token);
  
  if (options.count !== undefined) {
    url.searchParams.set("count", String(options.count));
  }
  if (options.page !== undefined) {
    url.searchParams.set("page", String(options.page));
  }
  if (options.screenName !== undefined) {
    url.searchParams.set("screen_name", options.screenName);
  }
  if (options.startTime !== undefined) {
    url.searchParams.set("start_time", String(options.startTime));
  }
  if (options.endTime !== undefined) {
    url.searchParams.set("end_time", String(options.endTime));
  }
  if (options.statDate !== undefined) {
    url.searchParams.set("stat_date", options.statDate);
  }
  if (options.feature !== undefined) {
    url.searchParams.set("feature", String(options.feature));
  }
  if (options.visible !== undefined) {
    url.searchParams.set("visible", String(options.visible));
  }
  if (options.trimUser !== undefined) {
    url.searchParams.set("trim_user", String(options.trimUser));
  }
  if (options.fetchDataOnly !== undefined) {
    url.searchParams.set("fetch_data_only", String(options.fetchDataOnly));
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `获取用户微博失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const result = (await response.json()) as WeiboStatusApiResponse;
  return result;
}

/**
 * 格式化单条微博
 */
function formatStatusItem(status: WeiboStatusItem) {
  const formatted: Record<string, unknown> = {
    id: status.id,
    mid: status.mid,
    text: status.text,
    source: status.source,
    createdAt: status.created_at,
    regionName: status.region_name,
    picIds: status.pic_ids,
    picNum: status.pic_num,
    thumbnailPic: status.thumbnail_pic,
    bmiddlePic: status.bmiddle_pic,
    originalPic: status.original_pic,
    visible: status.visible,
    moreInfoType: status.more_info_type,
    hasRetweet: !!status.retweeted_status,
  };

  // 添加用户信息
  if (status.user) {
    formatted.user = {
      id: status.user.id,
      screenName: status.user.screen_name,
      name: status.user.name,
      description: status.user.description,
      profileImageUrl: status.user.profile_image_url,
      followersCountStr: status.user.followers_count_str,
      friendsCount: status.user.friends_count,
      statusesCount: status.user.statuses_count,
      verifiedReason: status.user.verified_reason,
      vvip: status.user.vvip,
      svip: status.user.svip,
    };
  }

  // 添加转发微博信息
  if (status.retweeted_status) {
    formatted.retweetedStatus = formatStatusItem(status.retweeted_status);
  }

  // 添加数字显示策略
  if (status.number_display_strategy) {
    formatted.numberDisplayStrategy = {
      applyScenarioFlag: status.number_display_strategy.apply_scenario_flag,
      displayTextMinNumber: status.number_display_strategy.display_text_min_number,
      displayText: status.number_display_strategy.display_text,
    };
  }

  return formatted;
}

/**
 * 格式化结果
 */
function formatWeiboStatusResult(result: WeiboStatusApiResponse) {
  if (result.code !== 0) {
    return {
      success: false,
      error: result.message || "获取用户微博失败",
    };
  }

  const data = result.data;

  if (!data.statuses || data.statuses.length === 0) {
    return {
      success: true,
      total: 0,
      statuses: [],
      message: "没有找到微博内容",
    };
  }

  return {
    success: true,
    total: data.total_number,
    statuses: data.statuses.map(formatStatusItem),
  };
}

// ============ Configuration Types ============

export type WeiboStatusConfig = {
  /** API 端点，默认为 open-im.api.weibo.com */
  weiboStatusEndpoint?: string;
  /** App ID，用于获取 token */
  appId?: string;
  /** App Secret，用于获取 token */
  appSecret?: string;
  /** Token 端点，默认为 http://open-im.api.weibo.com/open/auth/ws_token */
  tokenEndpoint?: string;
  /** 是否启用工具，默认为 true */
  enabled?: boolean;
};

function getWeiboStatusConfig(api: OpenClawPluginApi): WeiboStatusConfig {
  const weiboCfg = api.config?.channels?.weibo as Record<string, unknown> | undefined;
  return {
    weiboStatusEndpoint: weiboCfg?.weiboStatusEndpoint as string | undefined,
    appId: weiboCfg?.appId as string | undefined,
    appSecret: weiboCfg?.appSecret as string | undefined,
    tokenEndpoint: weiboCfg?.tokenEndpoint as string | undefined,
    enabled: weiboCfg?.weiboStatusEnabled !== false,
  };
}

// ============ Tool Registration ============

export function registerWeiboStatusTools(api: OpenClawPluginApi) {
  const cfg = getWeiboStatusConfig(api);

  // 检查是否禁用了工具
  if (!cfg.enabled) {
    api.logger.debug?.("weibo_status: Tool disabled, skipping registration");
    return;
  }

  // 检查是否配置了认证信息
  if (!cfg.appId || !cfg.appSecret) {
    api.logger.warn?.("weibo_status: appId or appSecret not configured, tool disabled");
    return;
  }

  const appId = cfg.appId;
  const appSecret = cfg.appSecret;

  api.registerTool(
    () => ({
      name: "weibo_status",
      label: "Weibo Status",
      description:
        "获取用户自己发布的微博列表。返回用户发布的微博内容、互动数据等信息。需要 token 认证。",
      parameters: WeiboStatusSchema,
      async execute(_toolCallId, params) {
        const p = params as WeiboStatusParams;
        try {
          // 获取有效的 token
          const token = await getValidWeiboStatusToken(
            appId,
            appSecret,
            cfg.tokenEndpoint
          );

          const result = await fetchWeiboStatus({
            token,
            count: p.count,
            page: p.page,
            screenName: p.screen_name,
            startTime: p.start_time,
            endTime: p.end_time,
            statDate: p.stat_date,
            feature: p.feature,
            visible: p.visible,
            trimUser: p.trim_user,
            fetchDataOnly: p.fetch_data_only,
            endpoint: cfg.weiboStatusEndpoint,
          });

          return json(formatWeiboStatusResult(result));
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    }),
    { name: "weibo_status" }
  );
  api.logger.info?.("weibo_status: Registered weibo_status tool");
}
