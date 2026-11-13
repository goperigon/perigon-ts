import {
  Configuration,
  SignalMonitoringPlanDataSchemaSchema,
  V1Api,
  type SignalMonitoringPlanDataSchema,
} from "../../src";

const dataSchema: SignalMonitoringPlanDataSchema = {
  version: "V1",
  schema: {
    status: {
      type: "ENUM",
      values: ["open", "closed"],
      description: "Case status",
      nullable: false,
    },
    amount: { type: "INTEGER", min: 0, max: 10 },
    score: { type: "NUMBER", min: 0.5 },
    flag: { type: "BOOLEAN", required: false },
    published: { type: "DATE" },
    seenAt: { type: "DATETIME" },
    name: { type: "STRING" },
    link: { type: "URL" },
    tags: { type: "ARRAY", element: { type: "ENUM", values: ["a", "b"] } },
    people: {
      type: "ARRAY",
      element: {
        type: "OBJECT",
        shape: { age: { type: "INTEGER", max: 120 } },
      },
    },
    address: {
      type: "OBJECT",
      allowExtra: true,
      shape: {
        city: { type: "STRING" },
        zip: { type: "INTEGER", min: 0 },
      },
    },
  },
};

const parseField = (field: unknown) =>
  SignalMonitoringPlanDataSchemaSchema.safeParse({
    version: "V1",
    schema: { field },
  });

describe("signal monitoring data schema", () => {
  it("keeps every type-specific field when parsing", () => {
    expect(SignalMonitoringPlanDataSchemaSchema.parse(dataSchema)).toEqual(
      dataSchema,
    );
  });

  it.each([
    ["an unknown type", { type: "NOPE" }],
    ["an ENUM without values", { type: "ENUM" }],
    ["an ARRAY without element", { type: "ARRAY" }],
    ["an OBJECT without shape", { type: "OBJECT" }],
    [
      "an ARRAY nested in an ARRAY",
      { type: "ARRAY", element: { type: "ARRAY", element: { type: "URL" } } },
    ],
    [
      "an OBJECT nested in an OBJECT",
      { type: "OBJECT", shape: { inner: { type: "OBJECT", shape: {} } } },
    ],
    [
      "an ARRAY nested in an OBJECT",
      {
        type: "OBJECT",
        shape: { list: { type: "ARRAY", element: { type: "STRING" } } },
      },
    ],
  ])("rejects %s", (_, field) => {
    expect(parseField(field).success).toBe(false);
  });

  it("narrows fields by type", () => {
    const status =
      SignalMonitoringPlanDataSchemaSchema.parse(dataSchema).schema.status;

    expect(status.type === "ENUM" ? status.values : undefined).toEqual([
      "open",
      "closed",
    ]);
  });

  it("sends the full data schema when creating a monitor", async () => {
    let body: unknown;
    const api = new V1Api(
      new Configuration({
        apiKey: "test-key",
        fetchApi: async (_url, init) => {
          body = JSON.parse(String(init?.body));
          return new Response("{}", {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      }),
    );

    await api
      .createMonitorApi({
        signalApiCreateBody: {
          name: "Cases",
          classificationType: "EVENT",
          monitoringObjective: "Track cases",
          dataSchema,
          query: {},
        },
      })
      .catch(() => undefined);

    expect(body).toMatchObject({ dataSchema });
  });
});
