import { BASE_PATH, Configuration, V1Api } from "../../src";

function apiRecordingUrls(basePath?: string) {
  const urls: URL[] = [];
  const api = new V1Api(
    new Configuration({
      basePath,
      apiKey: "test-key",
      fetchApi: async (url) => {
        urls.push(new URL(String(url)));
        return new Response(JSON.stringify({ status: 200, results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    }),
  );
  return { api, urls };
}

describe("Configuration.basePath", () => {
  it("defaults to the production API", async () => {
    const { api, urls } = apiRecordingUrls();

    await api.getStoryCounts({ splitBy: "day" });

    expect(BASE_PATH).toBe("https://api.perigon.io");
    expect(new Configuration().basePath).toBe(BASE_PATH);
    expect(urls[0].origin).toBe("https://api.perigon.io");
    expect(urls[0].pathname).toBe("/v1/stories/stats");
  });

  it("sends requests to a custom base path, ignoring trailing slashes", async () => {
    const { api, urls } = apiRecordingUrls(
      "https://staging.example.com/proxy//",
    );

    await api.getStoryCounts({ splitBy: "day" });

    expect(urls[0].origin).toBe("https://staging.example.com");
    expect(urls[0].pathname).toBe("/proxy/v1/stories/stats");
  });
});

describe("getStoryCounts splitBy", () => {
  it("accepts none and returns the undated total", async () => {
    const urls: URL[] = [];
    const api = new V1Api(
      new Configuration({
        apiKey: "test-key",
        fetchApi: async (url) => {
          urls.push(new URL(String(url)));
          return new Response(
            JSON.stringify({ status: 200, results: [{ numResults: 42 }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        },
      }),
    );

    const result = await api.getStoryCounts({ q: "ai", splitBy: "none" });

    expect(urls[0].searchParams.get("splitBy")).toBe("none");
    expect(result.results).toEqual([{ numResults: 42 }]);
  });
});
