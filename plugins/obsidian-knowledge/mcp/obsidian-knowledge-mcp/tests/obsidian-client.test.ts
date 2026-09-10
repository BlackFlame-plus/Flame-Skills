import { describe, expect, it, vi } from "vitest";
import {
  ObsidianApiError,
  ObsidianClient,
  type RequestFn
} from "../src/obsidian-client.js";
import { sha256 } from "../src/governance.js";

function clientWith(request: RequestFn): ObsidianClient {
  return new ObsidianClient(
    {
      baseUrl: "https://127.0.0.1:27124",
      apiKey: "test-token",
      allowInsecureTls: true
    },
    request
  );
}

describe("ObsidianClient", () => {
  it("encodes path segments and sends Bearer authentication", async () => {
    const request = vi.fn<RequestFn>(
      async () => new Response("# 内容", { status: 200 })
    );
    const client = clientWith(request);

    await client.read("30_Knowledge/知识 库.md");

    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe(
      "https://127.0.0.1:27124/vault/30_Knowledge/%E7%9F%A5%E8%AF%86%20%E5%BA%93.md"
    );
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
      Accept: "text/markdown"
    });
  });

  it("posts a simple search and limits returned matches", async () => {
    const request = vi.fn<RequestFn>(async () =>
      Response.json([{ filename: "a.md" }, { filename: "b.md" }])
    );
    const client = clientWith(request);

    const result = await client.search("MCP 规则", 1);

    expect(result).toEqual([{ filename: "a.md" }]);
    const [url, init] = request.mock.calls[0]!;
    expect(url).toContain("/search/simple/?query=MCP+%E8%A7%84%E5%88%99");
    expect(init?.method).toBe("POST");
  });

  it("rejects missing credentials with an actionable error", async () => {
    const client = new ObsidianClient({
      baseUrl: "https://127.0.0.1:27124",
      apiKey: "",
      allowInsecureTls: true
    });

    await expect(client.health()).rejects.toMatchObject({
      code: "CONFIGURATION_ERROR"
    });
  });

  it("maps authentication failures", async () => {
    const client = clientWith(async () =>
      Response.json({ message: "Unauthorized" }, { status: 401 })
    );
    await expect(client.health()).rejects.toEqual(
      expect.objectContaining<Partial<ObsidianApiError>>({
        code: "AUTHENTICATION_FAILED"
      })
    );
  });

  it("moves only after hash, destination, and write verification succeed", async () => {
    const content = "---\nid: \"1\"\n---\n# Note\n";
    const request = vi
      .fn<RequestFn>()
      .mockResolvedValueOnce(
        new Response(content, {
          status: 200,
          headers: { "content-type": "text/markdown" }
        })
      )
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(content, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = clientWith(request);

    const result = await client.moveSafely(
      "01_Inbox/Note.md",
      "30_Knowledge/Note.md",
      sha256(content)
    );

    expect(result).toEqual({
      source: "01_Inbox/Note.md",
      destination: "30_Knowledge/Note.md",
      hash: sha256(content),
      state: "moved"
    });
    expect(request.mock.calls.map((call) => call[1]?.method ?? "GET")).toEqual([
      "GET",
      "GET",
      "PUT",
      "GET",
      "DELETE"
    ]);
    expect(request.mock.calls[4]?.[0]).toContain("permanent=false");
  });

  it("never mutates when the source hash is stale", async () => {
    const request = vi.fn<RequestFn>(async () => new Response("new content"));
    const client = clientWith(request);

    await expect(
      client.moveSafely("01_Inbox/a.md", "30_Knowledge/a.md", "stale")
    ).rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("reports a safe duplicate if source trashing fails", async () => {
    const content = "safe";
    const request = vi
      .fn<RequestFn>()
      .mockResolvedValueOnce(new Response(content))
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(content))
      .mockResolvedValueOnce(
        Response.json({ message: "locked" }, { status: 500 })
      );
    const client = clientWith(request);

    const result = await client.moveSafely(
      "01_Inbox/a.md",
      "30_Knowledge/a.md",
      sha256(content)
    );

    expect(result.state).toBe("duplicate");
    expect(result.message).toContain("preserved");
  });
});
