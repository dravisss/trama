/**
 * Remote MCP server (Streamable HTTP transport, stateless JSON responses).
 *
 * Endpoints:
 *   POST /mcp                 token via `Authorization: Bearer <edit token>`
 *                             or the `workspace_token` tool argument
 *   POST /w/<edit token>/mcp  token carried by the URL (paste-and-go for
 *                             clients that cannot set headers)
 *
 * Tools delegate to the shared operations layer, so MCP, REST and the CLI
 * behave identically.
 */
import { HttpError } from "../http.js";
import { extractEditToken } from "./tokens.js";

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const workspaceTokenProperty = {
  workspace_token: {
    type: "string",
    description: "Secret edit token (or full edit URL) of the workspace. Optional when the MCP connection already carries it."
  }
};

const mapSourceProperties = {
  markdown: { type: "string", description: "Map in Trama loop Markdown (.loop.md). Preferred format; see get_authoring_guide." },
  mermaid: { type: "string", description: "Alternative: Mermaid `graph TD` causal diagram. Edge labels +/- set polarity." },
  model: { type: "object", description: "Alternative: Trama model JSON ({ id, title, nodes, edges, loops })." }
};

export const MCP_TOOLS = [
  {
    name: "get_authoring_guide",
    title: "Authoring guide",
    description: "Returns the complete guide for writing causal loop maps (.loop.md) and presentations (.story.md) for Trama. Read it before authoring.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "none"
  },
  {
    name: "create_workspace",
    title: "Create workspace",
    description: "Creates a new private workspace (no account needed) and returns its secret edit link, edit token, MCP URL and read-only share link. Keep the edit token private.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Workspace title." },
        description: { type: "string", description: "Optional Markdown description of the workspace." },
        seed: { type: "string", enum: ["starter", "examples"], description: "starter = one empty map (default); examples = demo maps." }
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    auth: "none"
  },
  {
    name: "validate_map",
    title: "Validate map",
    description: "Compiles and audits a map without saving it: structural errors, loop classification (reinforcing/balancing) versus the R/B labels, and uncurated cycles.",
    inputSchema: { type: "object", properties: { ...mapSourceProperties } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "none"
  },
  {
    name: "validate_story",
    title: "Validate presentation",
    description: "Lints presentation Markdown (.story.md) against a map without saving. Pass map_id for a saved map, or map_markdown for an unsaved one.",
    inputSchema: {
      type: "object",
      required: ["markdown"],
      properties: {
        markdown: { type: "string", description: "Presentation Markdown (.story.md)." },
        map_id: { type: "string", description: "Saved map id in the workspace." },
        map_markdown: { type: "string", description: "Unsaved map Markdown to validate against." },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "optional"
  },
  {
    name: "get_workspace",
    title: "Get workspace",
    description: "Summarizes the workspace: maps, curated loops, presentations and share links.",
    inputSchema: { type: "object", properties: { ...workspaceTokenProperty } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "get_map",
    title: "Get map",
    description: "Reads one map as loop Markdown (default, ideal for editing and re-saving) or as model JSON, with its audit report and share links.",
    inputSchema: {
      type: "object",
      required: ["map_id"],
      properties: {
        map_id: { type: "string" },
        format: { type: "string", enum: ["markdown", "json"], description: "Default markdown." },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "save_map",
    title: "Save map",
    description: "Creates or updates a map (matched by the id in the Markdown frontmatter, or map_id). Validates before saving and returns the audit report and share links.",
    inputSchema: {
      type: "object",
      properties: {
        ...mapSourceProperties,
        map_id: { type: "string", description: "Force the map id (update an existing map)." },
        title: { type: "string" },
        description_md: { type: "string", description: "Map description: the question, system story and phenomenon." },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "delete_map",
    title: "Delete map",
    description: "Deletes a map. The last map of a workspace cannot be deleted.",
    inputSchema: {
      type: "object",
      required: ["map_id"],
      properties: { map_id: { type: "string" }, ...workspaceTokenProperty }
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "save_presentation",
    title: "Save presentation",
    description: "Creates or updates the presentation of a map from presentation Markdown (.story.md). Every focus must reference real node/edge/loop ids of the map. Returns lint results and the presentation link.",
    inputSchema: {
      type: "object",
      required: ["map_id", "markdown"],
      properties: {
        map_id: { type: "string" },
        markdown: { type: "string", description: "Presentation Markdown (.story.md)." },
        title: { type: "string" },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "get_presentation",
    title: "Get presentation",
    description: "Reads the presentation of a map (or by presentation_id) as Markdown (default) or JSON.",
    inputSchema: {
      type: "object",
      properties: {
        map_id: { type: "string" },
        presentation_id: { type: "string" },
        format: { type: "string", enum: ["markdown", "json"] },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "publish",
    title: "Publish map and presentation",
    description: "One-shot flow: saves a map and (optionally) its presentation, then returns the read-only share and presentation links.",
    inputSchema: {
      type: "object",
      properties: {
        map_markdown: { type: "string", description: "Map loop Markdown (.loop.md)." },
        map_mermaid: { type: "string", description: "Alternative: Mermaid diagram." },
        map_title: { type: "string" },
        story_markdown: { type: "string", description: "Optional presentation Markdown (.story.md)." },
        ...workspaceTokenProperty
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    auth: "required"
  },
  {
    name: "rotate_share_link",
    title: "Rotate share link",
    description: "Invalidates the current read-only share link and creates a new one.",
    inputSchema: { type: "object", properties: { ...workspaceTokenProperty } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    auth: "required"
  }
];

export function createMcpHandler({ operations, registry, config, guide, version }) {
  const instructions = [
    `${config.productName} hosts interactive causal loop diagrams (systems thinking maps) and narrated presentations.`,
    "Workflow: get_authoring_guide -> create_workspace (or use the connected workspace) -> validate_map -> save_map -> save_presentation -> share the returned links.",
    "Keep edit tokens private; share only share_url/present_url."
  ].join(" ");

  function resolveRecord(tokenFromTransport, args, { required }) {
    const token = extractEditToken(args?.workspace_token) || tokenFromTransport;
    if (!token) {
      if (required) throw new HttpError(401, "This tool needs a workspace. Call create_workspace first, then pass workspace_token (or connect to the workspace MCP URL).");
      return null;
    }
    const record = registry.resolveEditToken(token);
    if (!record) throw new HttpError(404, "Workspace not found. Check the edit token or link.");
    return record;
  }

  const handlers = {
    get_authoring_guide: () => ({ guide }),
    create_workspace: (_record, args) => operations.createWorkspace({
      title: args.title,
      description_md: args.description,
      seed: args.seed === "examples" ? "examples" : "starter"
    }),
    validate_map: (_record, args) => operations.validateMap(args),
    validate_story: (record, args) => operations.validateStory(record, {
      map_id: args.map_id,
      map: args.map_markdown ? { markdown: args.map_markdown } : undefined,
      markdown: args.markdown
    }),
    get_workspace: record => operations.getWorkspace(record),
    get_map: (record, args) => operations.getMap(record, args.map_id, { format: args.format === "json" ? "json" : "markdown" }),
    save_map: (record, args) => operations.saveMap(record, args, { id: args.map_id }),
    delete_map: (record, args) => operations.deleteMap(record, args.map_id),
    save_presentation: (record, args) => operations.savePresentation(record, args.map_id, { markdown: args.markdown, title: args.title }),
    get_presentation: (record, args) => operations.getPresentation(record, {
      id: args.presentation_id,
      map_id: args.map_id,
      format: args.format === "json" ? "json" : "markdown"
    }),
    publish: (record, args) => operations.publish(record, {
      map: { markdown: args.map_markdown, mermaid: args.map_mermaid, title: args.map_title },
      story: args.story_markdown ? { markdown: args.story_markdown } : null
    }),
    rotate_share_link: record => operations.rotateShare(record)
  };

  async function handleMessage(message, tokenFromTransport) {
    const isRequest = message && typeof message === "object" && "id" in message && message.id !== null;
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return isRequest || message?.id === undefined
        ? rpcError(message?.id ?? null, -32600, "Invalid Request")
        : null;
    }
    if (!isRequest) return null; // notifications (initialized, cancelled, ...)
    const { id, method, params = {} } = message;
    switch (method) {
      case "initialize": {
        const requested = params.protocolVersion;
        return rpcResult(id, {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "trama", title: config.productName, version },
          instructions
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, {
          tools: MCP_TOOLS.map(({ auth: _auth, ...tool }) => tool)
        });
      case "tools/call":
        return rpcResult(id, await callTool(params, tokenFromTransport));
      case "resources/list":
        return rpcResult(id, { resources: [] });
      case "prompts/list":
        return rpcResult(id, { prompts: [] });
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  async function callTool(params, tokenFromTransport) {
    const tool = MCP_TOOLS.find(item => item.name === params?.name);
    if (!tool) return toolError(`Unknown tool: ${params?.name}`);
    const args = params.arguments && typeof params.arguments === "object" ? params.arguments : {};
    try {
      const record = tool.auth === "none" ? null : resolveRecord(tokenFromTransport, args, { required: tool.auth === "required" });
      const result = await handlers[tool.name](record, args);
      return {
        content: [{ type: "text", text: typeof result.guide === "string" ? result.guide : JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    } catch (error) {
      if (error instanceof HttpError) return toolError(error.message, error.details);
      console.error("[mcp]", error);
      return toolError("Internal error while running the tool.");
    }
  }

  return { handleMessage };
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolError(message, details) {
  const text = details ? `${message}\n\n${JSON.stringify(details, null, 2)}` : message;
  return { isError: true, content: [{ type: "text", text }] };
}
