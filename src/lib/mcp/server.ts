import "server-only";

import { createHash } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { MaroMcpActor, MaroMcpAuthResult } from "@/lib/mcp/auth";
import { actorHasPermission } from "@/lib/mcp/auth";
import { getMaroMcpChallenge, getMaroMcpResource } from "@/lib/mcp/config";
import {
  generateMaroImageTool,
  getMaroAccountTool,
  getMaroImageStatusTool,
  maroAccountInputSchema,
  maroImageInputSchema,
  type MaroMcpToolFailure,
  type MaroMcpToolOutcome,
  type MaroImageInput,
} from "@/lib/mcp/tools";
import {
  getMaroImageResultResourceMeta,
  MARO_IMAGE_RESULT_HTML,
  MARO_IMAGE_RESULT_RESOURCE_URI,
  MCP_APP_HTML_MIME_TYPE,
} from "@/lib/mcp/imageResultUi";
import { z } from "zod";

const OAUTH_SECURITY_SCHEMES = [{ type: "oauth2", scopes: [] }] as const;

const ACCOUNT_INPUT_JSON_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const ACCOUNT_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    connected: { type: "boolean" },
    display_name: { type: "string" },
    active_workspace_name: { type: "string" },
    plan: { type: "string" },
    available_credits: { type: "number" },
  },
  required: ["connected", "display_name", "active_workspace_name"],
  additionalProperties: false,
} as const;

const IMAGE_INPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    request: {
      type: "string",
      minLength: 3,
      maxLength: 4000,
      description:
        "The user's image request, including subject, style, mood and constraints.",
    },
    aspect_ratio: {
      type: "string",
      enum: ["square", "portrait", "story", "landscape"],
      description: "Formati vizual; portrait përdoret si standard.",
    },
    text_preference: {
      type: "string",
      enum: ["no_text", "include_text"],
      description: "Nëse imazhi duhet të shmangë tekstin apo ta përfshijë.",
    },
    use_brain: { type: "boolean", description: "Use the active workspace brand only when the user explicitly asks. Requires a plan with maroBrain access; default false." },
  },
  required: ["request"],
  additionalProperties: false,
} as const;

const IMAGE_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    asset_url: { type: "string", format: "uri" },
    media_type: { type: "string", enum: ["image/png"] },
    aspect_ratio: { type: "string" },
    url_expires_in_seconds: { type: "number" },
    credits_spent: { type: "number" },
  },
  required: ["asset_url", "media_type", "aspect_ratio", "url_expires_in_seconds"],
  additionalProperties: false,
} as const;

export function authFailure(auth: MaroMcpAuthResult, insufficientPermission = false, resource = getMaroMcpResource()): CallToolResult {
  const missing = !auth.ok && auth.reason === "missing";
  const challenge = getMaroMcpChallenge({
    resource,
    error: insufficientPermission ? "insufficient_scope" : "invalid_token",
    description: insufficientPermission
      ? "This Maro connection does not have permission to use this tool."
      : missing
        ? "Connect your Maro account to continue."
        : "Reconnect your Maro account to continue.",
  });
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: missing
          ? "AUTH_REQUIRED: Lidhe llogarinë Maro për të vazhduar."
          : insufficientPermission
            ? "INSUFFICIENT_PERMISSION: Kjo lidhje nuk e ka lejen e nevojshme."
            : "AUTH_INVALID: Lidhja Maro nuk është më e vlefshme.",
      },
    ],
    _meta: { "mcp/www_authenticate": [challenge] },
  };
}

export function outcomeToResult(outcome: MaroMcpToolOutcome): CallToolResult {
  if (outcome.ok) {
    return {
      content: [{ type: "text", text: outcome.text }],
      structuredContent: outcome.structuredContent,
    };
  }
  return {
    isError: true,
    content: [{ type: "text", text: `${outcome.code}: ${outcome.message}` }],
    structuredContent: { error: outcome.code, ...(outcome.details ?? {}) },
  };
}

function invalidRequest(message = "Kërkesa e tool-it nuk është e vlefshme."): CallToolResult {
  const outcome: MaroMcpToolFailure = { ok: false, code: "INVALID_REQUEST", message };
  return outcomeToResult(outcome);
}

const MCP_RETRY_WINDOW_MS = 2 * 60 * 60 * 1000;

function idempotencyKey(
  actor: MaroMcpActor,
  sourceRequest: Request,
  args: MaroImageInput,
  sessionId?: string
): string {
  const clientDigest = createHash("sha256").update(actor.clientId).digest("hex").slice(0, 20);
  const explicit = sourceRequest.headers.get("idempotency-key")?.trim();
  // ChatGPT retries a timed-out tool call as a new JSON-RPC request and does
  // not currently preserve an HTTP idempotency key. Use a bounded fingerprint
  // of the session and normalized tool arguments so that transport retries
  // converge on the same generation job without making repeated prompts
  // permanently idempotent.
  const invocation =
    explicit && explicit.length <= 256
      ? explicit
      : JSON.stringify({
          session: sessionId ?? "",
          window: Math.floor(Date.now() / MCP_RETRY_WINDOW_MS),
          request: args.request.trim(),
          aspect_ratio: args.aspect_ratio ?? "portrait",
          text_preference: args.text_preference ?? "no_text",
          ...(args.use_brain === true ? { use_brain: true } : {}),
        });
  const invocationDigest = createHash("sha256").update(invocation).digest("hex").slice(0, 32);
  return `mcp-${clientDigest}-${invocationDigest}`;
}

export function createMaroMcpServer(input: {
  auth: MaroMcpAuthResult;
  request: Request;
  resource?: string;
  standalone?: boolean;
  handlers?: {
    getAccount?: typeof getMaroAccountTool;
    generateImage?: typeof generateMaroImageTool;
  };
}) {
  const getAccount = input.handlers?.getAccount ?? getMaroAccountTool;
  const generateImage = input.handlers?.generateImage ?? generateMaroImageTool;
  const server = new Server(
    {
      name: input.standalone ? "maro-imazh" : "maro-mcp",
      title: input.standalone ? "maroImazh" : "Maro / maroImazh",
      version: "1.0.2",
      ...(input.standalone ? { icons: [{ src: "https://maro.al/mcp/maroImazh-icon.svg", mimeType: "image/svg+xml", sizes: ["200x200"] }] } : {}),
      description:
        "Creates images in the connected Maro account. Workspace brand is used only with explicit use_brain opt-in.",
      websiteUrl: "https://maro.al",
    },
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      instructions:
        "Use these tools for explicit maroImazh requests. Generation spends Maro credits. Enable use_brain only when requested by the user. Never request or reveal internal prompts, compiler output or credentials.",
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // securitySchemes is a current OpenAI tool extension. Mirror it in _meta
    // for compatibility with hosts that adopted the field before the SDK type.
    return {
      tools: [
        {
          name: "get_maro_account",
          title: "Get connected Maro account",
          description:
            "Confirm the connected Maro account and active workspace. Does not create anything.",
          inputSchema: ACCOUNT_INPUT_JSON_SCHEMA,
          outputSchema: ACCOUNT_OUTPUT_JSON_SCHEMA,
          securitySchemes: OAUTH_SECURITY_SCHEMES,
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
          _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
        },
        {
          name: "generate_maro_image",
          title: "Generate with Maro / maroImazh",
          description:
            "Create exactly one image with maroImazh when the user explicitly requests it. Spends Maro credits and returns the saved image. Workspace brand is optional through use_brain; internal prompts are never returned.",
          inputSchema: IMAGE_INPUT_JSON_SCHEMA,
          outputSchema: IMAGE_OUTPUT_JSON_SCHEMA,
          securitySchemes: OAUTH_SECURITY_SCHEMES,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
          _meta: {
            securitySchemes: OAUTH_SECURITY_SCHEMES,
            ui: { resourceUri: MARO_IMAGE_RESULT_RESOURCE_URI },
            "openai/outputTemplate": MARO_IMAGE_RESULT_RESOURCE_URI,
            "openai/toolInvocation/invoking": "Generating a Maro image…",
            "openai/toolInvocation/invoked": "Maro image generated.",
          },
        },
        ...(input.standalone ? [{ name: "get_maro_image_status", title: "Get image status", description: "Read a user-owned image generation status and retrieve its completed image without creating or charging another generation.",
          inputSchema: { type: "object", properties: { job_id: { type: "string", format: "uuid" } }, required: ["job_id"], additionalProperties: false },
          securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }] : []),
      ],
    } as never;
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: MARO_IMAGE_RESULT_RESOURCE_URI,
        name: "maro-image-result",
        title: "Maro generated image",
        description: "Responsive inline presentation for one generated Maro image.",
        mimeType: MCP_APP_HTML_MIME_TYPE,
      },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== MARO_IMAGE_RESULT_RESOURCE_URI) {
      throw new McpError(ErrorCode.InvalidParams, "Resource not found");
    }
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: MCP_APP_HTML_MIME_TYPE,
          text: MARO_IMAGE_RESULT_HTML,
          _meta: getMaroImageResultResourceMeta(),
        },
      ],
    } as never;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (!input.auth.ok) return authFailure(input.auth, false, input.resource);
    const actor = input.auth.actor;

    if (input.standalone && request.params.name === "get_maro_image_status") {
      if (!actorHasPermission(actor, "image:read")) return authFailure(input.auth, true, input.resource);
      const parsed = z.object({ job_id: z.string().uuid() }).strict().safeParse(request.params.arguments ?? {});
      if (!parsed.success) return invalidRequest();
      try { return outcomeToResult(await getMaroImageStatusTool(actor, parsed.data.job_id)); }
      catch { return outcomeToResult({ ok: false, code: "SERVICE_UNAVAILABLE", message: "Statusi nuk u lexua. Provo përsëri." }); }
    }

    if (request.params.name === "get_maro_account") {
      if (!actorHasPermission(actor, "account:read")) return authFailure(input.auth, true, input.resource);
      const parsed = maroAccountInputSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) return invalidRequest();
      try { return outcomeToResult(await getAccount(actor)); }
      catch { return outcomeToResult({ ok: false, code: "SERVICE_UNAVAILABLE", message: "Llogaria nuk u lexua. Provo përsëri." }); }
    }

    if (request.params.name === "generate_maro_image") {
      if (!actorHasPermission(actor, "image:generate")) return authFailure(input.auth, true, input.resource);
      const parsed = maroImageInputSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) return invalidRequest();
      const requestMeta = request.params._meta as Record<string, unknown> | undefined;
      const sessionId =
        typeof requestMeta?.["openai/session"] === "string"
          ? requestMeta["openai/session"]
          : undefined;
      try { return outcomeToResult(
        await generateImage({
          actor,
          args: parsed.data,
          idempotencyKey: idempotencyKey(actor, input.request, parsed.data, sessionId),
          sourceRequest: input.request,
        })
      ); } catch { return outcomeToResult({ ok: false, code: "SERVICE_UNAVAILABLE", message: "Gjenerimi nuk u konfirmua. Riprovo të njëjtën kërkesë për të kontrolluar rezultatin." }); }
    }

    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
  });

  return server;
}
