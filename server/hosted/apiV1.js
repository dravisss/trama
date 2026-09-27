/**
 * Agent REST API (`/api/v1`). Authorization is the workspace edit token sent
 * as `Authorization: Bearer <token>`. Workspace creation and validation are
 * open to anyone (rate limited).
 */
import { HttpError, sendJson } from "../http.js";
import { extractEditToken } from "./tokens.js";

export async function handleApiV1({ request, response, url, operations, registry, config, readBody, cors }) {
  const parts = url.pathname.split("/").filter(Boolean).slice(2); // drop "api", "v1"
  const method = request.method;
  const reply = (status, body) => sendJson(response, status, body, cors);
  const requireWorkspace = () => {
    const header = String(request.headers.authorization || "");
    const token = extractEditToken(header.replace(/^Bearer\s+/i, "").trim());
    if (!token) throw new HttpError(401, "Send the workspace edit token as `Authorization: Bearer <token>`.");
    const record = registry.resolveEditToken(token);
    if (!record) throw new HttpError(404, "Workspace not found.");
    return record;
  };
  const route = `${method} /${parts.map((part, index) => (index > 0 && ["maps", "presentations"].includes(parts[index - 1]) ? ":id" : part)).join("/")}`;
  const id = () => decodeURIComponent(parts[1]);
  const format = url.searchParams.get("format") === "markdown" ? "markdown" : "json";

  switch (route) {
    case "GET /":
      return reply(200, {
        name: config.productName,
        docs: `${config.publicUrl}/llms.txt`,
        openapi: `${config.publicUrl}/api/v1/openapi.json`,
        mcp: `${config.publicUrl}/mcp`
      });
    case "GET /openapi.json":
      return reply(200, { ...OPENAPI_DOCUMENT, servers: [{ url: `${config.publicUrl}/api/v1` }] });
    case "POST /workspaces":
      return reply(201, operations.createWorkspace(await readBody("bundle")));
    case "POST /validate/map":
      return reply(200, operations.validateMap(await readBody()));
    case "POST /validate/story": {
      const body = await readBody();
      const header = request.headers.authorization ? requireWorkspace() : null;
      return reply(200, operations.validateStory(header, body));
    }
    case "GET /workspace":
      return reply(200, operations.getWorkspace(requireWorkspace()));
    case "PATCH /workspace":
      return reply(200, operations.updateWorkspace(requireWorkspace(), await readBody()));
    case "DELETE /workspace": {
      const record = requireWorkspace();
      if (url.searchParams.get("confirm") !== "delete") {
        throw new HttpError(400, "Add ?confirm=delete to permanently delete this workspace.");
      }
      return reply(200, operations.deleteWorkspace(record));
    }
    case "POST /workspace/share/rotate":
      return reply(200, operations.rotateShare(requireWorkspace()));
    case "GET /workspace/export":
      return reply(200, operations.exportWorkspace(requireWorkspace()));
    case "GET /maps":
      return reply(200, operations.listMaps(requireWorkspace()));
    case "POST /maps": {
      const record = requireWorkspace();
      const result = operations.saveMap(record, await readBody());
      return reply(result.created ? 201 : 200, result);
    }
    case "GET /maps/:id":
      return reply(200, operations.getMap(requireWorkspace(), id(), { format }));
    case "PUT /maps/:id": {
      const record = requireWorkspace();
      const result = operations.saveMap(record, await readBody(), { id: id() });
      return reply(result.created ? 201 : 200, result);
    }
    case "DELETE /maps/:id":
      return reply(200, operations.deleteMap(requireWorkspace(), id()));
    case "GET /maps/:id/presentation":
      return reply(200, operations.getPresentation(requireWorkspace(), { map_id: id(), format }));
    case "PUT /maps/:id/presentation":
    case "POST /maps/:id/presentation": {
      const record = requireWorkspace();
      const result = operations.savePresentation(record, id(), await readBody());
      return reply(result.created ? 201 : 200, result);
    }
    case "GET /presentations":
      return reply(200, operations.listPresentations(requireWorkspace()));
    case "GET /presentations/:id":
      return reply(200, operations.getPresentation(requireWorkspace(), { id: id(), format }));
    case "DELETE /presentations/:id":
      return reply(200, operations.deletePresentation(requireWorkspace(), id()));
    case "POST /publish":
      return reply(200, operations.publish(requireWorkspace(), await readBody()));
    default:
      throw new HttpError(404, `Unknown endpoint ${method} ${url.pathname}. See /api/v1/openapi.json.`);
  }
}

const mapSource = {
  type: "object",
  description: "Provide exactly one of markdown, mermaid or model.",
  properties: {
    markdown: { type: "string", description: "Loop Markdown (.loop.md)." },
    mermaid: { type: "string", description: "Mermaid graph TD causal diagram." },
    model: { type: "object", description: "Trama model JSON." },
    title: { type: "string" },
    description_md: { type: "string" }
  }
};

const storySource = {
  type: "object",
  properties: {
    markdown: { type: "string", description: "Presentation Markdown (.story.md)." },
    presentation: { type: "object", description: "Presentation V2 JSON (alternative to markdown)." },
    title: { type: "string" }
  }
};

const ok = description => ({ description, content: { "application/json": { schema: { type: "object" } } } });
const secured = [{ workspaceToken: [] }];
const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };
const formatParam = { name: "format", in: "query", schema: { type: "string", enum: ["json", "markdown"] } };

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "Trama API",
    version: "1.0.0",
    description: "Account-less hosting for interactive causal loop diagrams and presentations. The workspace edit token is the only credential. Full authoring guide: /llms.txt."
  },
  components: {
    securitySchemes: {
      workspaceToken: { type: "http", scheme: "bearer", description: "Workspace edit token returned by POST /workspaces." }
    }
  },
  paths: {
    "/workspaces": {
      post: {
        summary: "Create a workspace",
        requestBody: { content: { "application/json": { schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description_md: { type: "string" },
            seed: { type: "string", enum: ["starter", "examples", "empty"] },
            bundle: { type: "object", description: "Optional Trama project bundle (trama-project or legacy loopviewer-project) to import." }
          }
        } } } },
        responses: { 201: ok("Workspace with edit_token, edit_url, share_url, mcp_url.") }
      }
    },
    "/validate/map": {
      post: { summary: "Compile and audit a map without saving", requestBody: { content: { "application/json": { schema: mapSource } } }, responses: { 200: ok("Report."), 422: ok("Invalid map.") } }
    },
    "/validate/story": {
      post: {
        summary: "Lint a presentation against a map without saving",
        requestBody: { content: { "application/json": { schema: {
          type: "object",
          properties: { markdown: { type: "string" }, map_id: { type: "string" }, map: mapSource }
        } } } },
        responses: { 200: ok("Lint result."), 422: ok("Presentation does not match the map.") }
      }
    },
    "/workspace": {
      get: { summary: "Workspace summary and links", security: secured, responses: { 200: ok("Workspace.") } },
      patch: { summary: "Update title/description", security: secured, responses: { 200: ok("Workspace.") } },
      delete: { summary: "Delete the workspace (requires ?confirm=delete)", security: secured, responses: { 200: ok("Deleted.") } }
    },
    "/workspace/share/rotate": { post: { summary: "Replace the read-only share link", security: secured, responses: { 200: ok("Workspace.") } } },
    "/workspace/export": { get: { summary: "Download a full project bundle", security: secured, responses: { 200: ok("Bundle.") } } },
    "/maps": {
      get: { summary: "List maps", security: secured, responses: { 200: ok("Maps.") } },
      post: { summary: "Create or update a map (matched by id)", security: secured, requestBody: { content: { "application/json": { schema: mapSource } } }, responses: { 200: ok("Updated."), 201: ok("Created."), 422: ok("Invalid map.") } }
    },
    "/maps/{id}": {
      get: { summary: "Read a map", security: secured, parameters: [idParam, formatParam], responses: { 200: ok("Map.") } },
      put: { summary: "Replace a map", security: secured, parameters: [idParam], requestBody: { content: { "application/json": { schema: mapSource } } }, responses: { 200: ok("Updated.") } },
      delete: { summary: "Delete a map", security: secured, parameters: [idParam], responses: { 200: ok("Deleted.") } }
    },
    "/maps/{id}/presentation": {
      get: { summary: "Read the presentation of a map", security: secured, parameters: [idParam, formatParam], responses: { 200: ok("Presentation.") } },
      put: { summary: "Create or update the presentation of a map", security: secured, parameters: [idParam], requestBody: { content: { "application/json": { schema: storySource } } }, responses: { 200: ok("Updated."), 201: ok("Created."), 422: ok("Lint errors.") } }
    },
    "/presentations": { get: { summary: "List presentations", security: secured, responses: { 200: ok("Presentations.") } } },
    "/presentations/{id}": {
      get: { summary: "Read a presentation", security: secured, parameters: [idParam, formatParam], responses: { 200: ok("Presentation.") } },
      delete: { summary: "Delete a presentation", security: secured, parameters: [idParam], responses: { 200: ok("Deleted.") } }
    },
    "/publish": {
      post: {
        summary: "Save a map and its presentation in one call",
        security: secured,
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { map: mapSource, story: storySource } } } } },
        responses: { 200: ok("Links and reports.") }
      }
    }
  }
};
