import "server-only";

import { createHash } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { MaroMcpActor, MaroMcpAuthResult } from "@/lib/mcp/auth";
import { actorHasPermission } from "@/lib/mcp/auth";
import { getMaroMcpChallenge } from "@/lib/mcp/config";
import {
  generateMaroImageTool,
  getMaroAccountTool,
  maroAccountInputSchema,
  maroImageInputSchema,
  type MaroMcpToolFailure,
  type MaroMcpToolOutcome,
} from "@/lib/mcp/tools";

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
      description: "Përshkrimi i imazhit që përdoruesi kërkon të krijojë.",
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

function authFailure(auth: MaroMcpAuthResult, insufficientPermission = false): CallToolResult {
  const missing = !auth.ok && auth.reason === "missing";
  const challenge = getMaroMcpChallenge({
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

function outcomeToResult(outcome: MaroMcpToolOutcome): CallToolResult {
  if (outcome.ok) {
    return {
      content: outcome.content ?? [{ type: "text", text: outcome.text }],
      structuredContent: outcome.structuredContent,
    };
  }
  return {
    isError: true,
    content: [{ type: "text", text: `${outcome.code}: ${outcome.message}` }],
    structuredContent: { error: outcome.code },
  };
}

function invalidRequest(message = "Kërkesa e tool-it nuk është e vlefshme."): CallToolResult {
  const outcome: MaroMcpToolFailure = { ok: false, code: "INVALID_REQUEST", message };
  return outcomeToResult(outcome);
}

function idempotencyKey(actor: MaroMcpActor, requestId: string | number): string {
  const clientDigest = createHash("sha256").update(actor.clientId).digest("hex").slice(0, 20);
  const safeRequest = String(requestId).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 72);
  return `mcp-${clientDigest}-${safeRequest}`;
}

export function createMaroMcpServer(input: {
  auth: MaroMcpAuthResult;
  request: Request;
  handlers?: {
    getAccount?: typeof getMaroAccountTool;
    generateImage?: typeof generateMaroImageTool;
  };
}) {
  const getAccount = input.handlers?.getAccount ?? getMaroAccountTool;
  const generateImage = input.handlers?.generateImage ?? generateMaroImageTool;
  const server = new Server(
    { name: "maro-mcp", version: "1.0.0" },
    {
      capabilities: { tools: { listChanged: false } },
      instructions:
        "Use Maro only for the connected user's account and maroImazh generation. Never request or reveal Maro internal prompts, compiler output, tokens, ids, or hidden brand intelligence.",
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
          title: "Generate an image with Maro",
          description:
            "Create one maroImazh asset for the connected user's active workspace. Uses Maro brand intelligence privately and spends Maro credits. Never returns hidden prompts.",
          inputSchema: IMAGE_INPUT_JSON_SCHEMA,
          outputSchema: IMAGE_OUTPUT_JSON_SCHEMA,
          securitySchemes: OAUTH_SECURITY_SCHEMES,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
          _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
        },
      ],
    } as never;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (!input.auth.ok) return authFailure(input.auth);
    const actor = input.auth.actor;

    if (request.params.name === "get_maro_account") {
      if (!actorHasPermission(actor, "account:read")) return authFailure(input.auth, true);
      const parsed = maroAccountInputSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) return invalidRequest();
      return outcomeToResult(await getAccount(actor));
    }

    if (request.params.name === "generate_maro_image") {
      if (!actorHasPermission(actor, "image:generate")) return authFailure(input.auth, true);
      const parsed = maroImageInputSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) return invalidRequest();
      return outcomeToResult(
        await generateImage({
          actor,
          args: parsed.data,
          idempotencyKey: idempotencyKey(actor, extra.requestId),
          sourceRequest: input.request,
        })
      );
    }

    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
  });

  return server;
}
