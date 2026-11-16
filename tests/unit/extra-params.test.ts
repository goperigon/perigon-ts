import { ZodError } from "zod";
import { Configuration, V1Api } from "../../src";

type SearchStoriesRequest = Parameters<V1Api["searchStories"]>[0];

const storiesResponse = { status: 200, numResults: 0, results: [] };

describe("extraParams", () => {
  let requests: { url: URL; init?: RequestInit }[];
  let responseBody: unknown;
  let api: V1Api;

  beforeEach(() => {
    requests = [];
    responseBody = storiesResponse;
    api = new V1Api(
      new Configuration({
        apiKey: "test-key",
        fetchApi: async (url, init) => {
          requests.push({ url: new URL(String(url)), init });
          return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      }),
    );
  });

  it("sends undeclared parameters alongside validated declared ones", async () => {
    await api.searchStories({
      q: "ai",
      size: 5,
      extraParams: {
        language: "en",
        label: ["Opinion", "Paid News"],
        minUniqueSourcesCount: 3,
        includeDrafts: false,
        asOf: new Date("2026-01-02T03:04:05.000Z"),
      },
    });

    const query = requests[0].url.searchParams;
    expect(requests[0].url.pathname).toBe("/v1/stories/all");
    expect(query.get("q")).toBe("ai");
    expect(query.get("size")).toBe("5");
    expect(query.get("language")).toBe("en");
    expect(query.getAll("label")).toEqual(["Opinion", "Paid News"]);
    expect(query.get("minUniqueSourcesCount")).toBe("3");
    expect(query.get("includeDrafts")).toBe("false");
    expect(query.get("asOf")).toBe("2026-01-02T03:04:05.000Z");
  });

  it("still validates declared parameters when extraParams is present", async () => {
    const params = {
      q: "ai",
      size: "five",
      extraParams: { language: "en" },
    } as unknown as SearchStoriesRequest;

    await expect(api.searchStories(params)).rejects.toBeInstanceOf(ZodError);
    expect(requests).toHaveLength(0);
  });

  it("omits null and undefined values instead of serializing them", async () => {
    await api.searchStories({
      q: "ai",
      state: undefined,
      extraParams: { language: undefined, label: null },
    });

    expect([...requests[0].url.searchParams.keys()]).toEqual(["q"]);
  });

  it("drops unknown top-level parameters, as before extraParams existed", async () => {
    const params = {
      q: "ai",
      language: "en",
      label: ["Opinion"],
    } as SearchStoriesRequest;

    await api.searchStories(params);

    expect([...requests[0].url.searchParams.keys()]).toEqual(["q"]);
  });

  it("lets extraParams override declared parameters without validating them", async () => {
    await api.searchStories({
      q: "ai",
      size: 5,
      extraParams: { size: "not-a-number", state: "anything" },
    });

    const query = requests[0].url.searchParams;
    expect(query.getAll("size")).toEqual(["not-a-number"]);
    expect(query.get("state")).toBe("anything");
  });

  it("sends extraParams on operations without declared query parameters", async () => {
    responseBody = { status: 200 };
    await api
      .activateMonitorApi({ uuid: "monitor-1", extraParams: { dryRun: true } })
      .catch(() => undefined);

    expect(requests[0].url.pathname).toBe(
      "/v1/api/monitors/monitor-1/activate",
    );
    expect(requests[0].url.searchParams.get("dryRun")).toBe("true");
  });

  it("sends extraParams in the query and leaves the request body unchanged", async () => {
    responseBody = { status: 200, numResults: 0, results: [], summary: "" };
    await api
      .searchSummarizer({
        q: "ai",
        summaryBody: { prompt: "Summarize." },
        extraParams: { language: "en" },
      })
      .catch(() => undefined);

    expect(requests[0].url.searchParams.get("q")).toBe("ai");
    expect(requests[0].url.searchParams.get("language")).toBe("en");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      prompt: "Summarize.",
    });
  });

  it("sends no query string when nothing is set", async () => {
    responseBody = { status: 200 };
    await api.activateMonitorApi({ uuid: "monitor-1" }).catch(() => undefined);

    expect(requests[0].url.search).toBe("");
  });

  it("rejects extra values that cannot be sent as a query parameter", async () => {
    const params = {
      q: "ai",
      extraParams: { nested: { a: 1 } },
    } as unknown as SearchStoriesRequest;

    await expect(api.searchStories(params)).rejects.toBeInstanceOf(ZodError);
    expect(requests).toHaveLength(0);
  });
});
