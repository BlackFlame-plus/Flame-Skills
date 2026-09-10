import { Agent, fetch as undiciFetch, type Dispatcher } from "undici";
import { assertReadablePath, sha256 } from "./governance.js";

export interface ObsidianClientConfig {
  baseUrl: string;
  apiKey: string;
  allowInsecureTls: boolean;
}

interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  dispatcher?: Dispatcher;
}

export type RequestFn = (
  url: string,
  init?: RequestOptions
) => Promise<HttpResponse>;

export class ObsidianApiError extends Error {
  constructor(
    public readonly code:
      | "CONFIGURATION_ERROR"
      | "AUTHENTICATION_FAILED"
      | "NOT_FOUND"
      | "DESTINATION_CONFLICT"
      | "STALE_SOURCE"
      | "WRITE_VERIFICATION_FAILED"
      | "API_ERROR"
      | "CONNECTION_FAILED",
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ObsidianApiError";
  }
}

export interface MoveResult {
  source: string;
  destination: string;
  hash: string;
  state: "moved" | "duplicate";
  message?: string;
}

function encodeVaultPath(vaultPath: string): string {
  return assertReadablePath(vaultPath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class ObsidianClient {
  private readonly baseUrl: string;
  private readonly dispatcher?: Dispatcher;
  private readonly requestFn: RequestFn;

  constructor(
    private readonly config: ObsidianClientConfig,
    requestFn?: RequestFn
  ) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.dispatcher =
      config.allowInsecureTls && this.baseUrl.startsWith("https://")
        ? new Agent({ connect: { rejectUnauthorized: false } })
        : undefined;
    this.requestFn =
      requestFn ??
      (undiciFetch as unknown as RequestFn);
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !/^https?:\/\//.test(this.baseUrl)) {
      throw new ObsidianApiError(
        "CONFIGURATION_ERROR",
        "Set OBSIDIAN_API_URL to an http:// or https:// Local REST API URL."
      );
    }
    if (!this.config.apiKey.trim()) {
      throw new ObsidianApiError(
        "CONFIGURATION_ERROR",
        "Set the Obsidian Local REST API key in the plugin configuration."
      );
    }
  }

  private async request(
    url: string,
    init: RequestOptions = {},
    allowNotFound = false
  ): Promise<HttpResponse> {
    this.assertConfigured();
    let response: HttpResponse;
    try {
      response = await this.requestFn(url, {
        ...init,
        dispatcher: this.dispatcher,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...init.headers
        }
      });
    } catch (error) {
      throw new ObsidianApiError(
        "CONNECTION_FAILED",
        `Cannot connect to Obsidian Local REST API. Ensure Obsidian is open and the plugin is enabled. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (allowNotFound && response.status === 404) return response;
    if (response.ok) return response;
    if (response.status === 401 || response.status === 403) {
      throw new ObsidianApiError(
        "AUTHENTICATION_FAILED",
        "Obsidian rejected the API key. Reconfigure the plugin credential.",
        response.status
      );
    }
    if (response.status === 404) {
      throw new ObsidianApiError(
        "NOT_FOUND",
        "The requested Obsidian note does not exist.",
        404
      );
    }

    const detail = (await response.text()).slice(0, 500);
    throw new ObsidianApiError(
      "API_ERROR",
      `Obsidian Local REST API returned ${response.status} ${
        response.statusText
      }${detail ? `: ${detail}` : ""}`,
      response.status
    );
  }

  private noteUrl(vaultPath: string): string {
    return `${this.baseUrl}/vault/${encodeVaultPath(vaultPath)}`;
  }

  async health(): Promise<unknown> {
    const response = await this.request(`${this.baseUrl}/`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { status: "ok", response: text };
    }
  }

  async search(query: string, limit = 10): Promise<unknown[]> {
    const url = new URL(`${this.baseUrl}/search/simple/`);
    url.searchParams.set("query", query);
    const response = await this.request(url.toString(), {
      method: "POST",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    const matches = Array.isArray(payload)
      ? payload
      : typeof payload === "object" &&
          payload !== null &&
          Array.isArray((payload as { matches?: unknown[] }).matches)
        ? (payload as { matches: unknown[] }).matches
        : [];
    return matches.slice(0, Math.max(1, Math.min(limit, 50)));
  }

  async read(vaultPath: string): Promise<string> {
    const response = await this.request(this.noteUrl(vaultPath), {
      method: "GET",
      headers: { Accept: "text/markdown" }
    });
    return response.text();
  }

  async exists(vaultPath: string): Promise<boolean> {
    const response = await this.request(
      this.noteUrl(vaultPath),
      { method: "GET", headers: { Accept: "text/markdown" } },
      true
    );
    return response.status !== 404;
  }

  private async put(vaultPath: string, content: string): Promise<void> {
    await this.request(this.noteUrl(vaultPath), {
      method: "PUT",
      headers: { "Content-Type": "text/markdown" },
      body: content
    });
  }

  async writeNew(vaultPath: string, content: string): Promise<void> {
    if (await this.exists(vaultPath)) {
      throw new ObsidianApiError(
        "DESTINATION_CONFLICT",
        `Destination already exists: ${vaultPath}`
      );
    }
    await this.put(vaultPath, content);
  }

  async moveSafely(
    sourceInput: string,
    destinationInput: string,
    expectedHash: string,
    destinationContent?: string
  ): Promise<MoveResult> {
    const source = assertReadablePath(sourceInput);
    const destination = assertReadablePath(destinationInput);
    const content = await this.read(source);
    const actualHash = sha256(content);
    if (actualHash !== expectedHash) {
      throw new ObsidianApiError(
        "STALE_SOURCE",
        "Source note changed after it was read. Re-read and validate it before moving."
      );
    }
    if (await this.exists(destination)) {
      throw new ObsidianApiError(
        "DESTINATION_CONFLICT",
        `Destination already exists: ${destination}`
      );
    }

    const contentToWrite = destinationContent ?? content;
    const destinationHash = sha256(contentToWrite);
    await this.put(destination, contentToWrite);
    const written = await this.read(destination);
    if (sha256(written) !== destinationHash) {
      throw new ObsidianApiError(
        "WRITE_VERIFICATION_FAILED",
        `Destination verification failed; source was preserved: ${source}`
      );
    }

    try {
      const deleteUrl = new URL(this.noteUrl(source));
      deleteUrl.searchParams.set("permanent", "false");
      await this.request(deleteUrl.toString(), { method: "DELETE" });
      return {
        source,
        destination,
        hash: destinationHash,
        state: "moved"
      };
    } catch (error) {
      return {
        source,
        destination,
        hash: destinationHash,
        state: "duplicate",
        message: `Both copies were preserved because the source could not be moved to trash: ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  }
}
