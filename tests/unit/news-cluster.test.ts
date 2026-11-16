import { Configuration, V1Api } from "../../src";

const apiReturning = (body: unknown) =>
  new V1Api(
    new Configuration({
      apiKey: "test-key",
      fetchApi: async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    }),
  );

describe("NewsCluster", () => {
  it("returns the source count and diversity computed by the API", async () => {
    const api = apiReturning({
      status: 200,
      numResults: 1,
      results: [
        {
          id: "story-1",
          totalCount: 40,
          uniqueCount: 25,
          uniqueSourcesCount: 10,
          sourceDiversity: 0.25,
        },
      ],
    });

    const { results } = await api.searchStories({ q: "ai" });

    expect(results[0]).toMatchObject({
      uniqueSourcesCount: 10,
      sourceDiversity: 0.25,
    });
  });

  it("accepts stories without the computed fields", async () => {
    const api = apiReturning({
      status: 200,
      numResults: 1,
      results: [{ id: "story-1", uniqueSourcesCount: null }],
    });

    const { results } = await api.searchStories({ q: "ai" });

    expect(results[0].uniqueSourcesCount).toBeNull();
    expect(results[0].sourceDiversity).toBeUndefined();
  });
});
