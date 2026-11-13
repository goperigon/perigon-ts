import type {
  ExtraQueryParams,
  SignalMonitoringPlanDataSchemaSchemaValue,
  V1Api,
} from "../../src";

// Checked by `bun run typecheck`; the body never runs.
function typeChecks(api: V1Api) {
  void api.searchStories({ q: "ai", extraParams: { language: "en" } });
  void api.searchStories({ extraParams: { label: ["a", 1, true], d: null } });
  void api.activateMonitorApi({ uuid: "m", extraParams: { dryRun: true } });

  // @ts-expect-error Undeclared parameters must go through extraParams.
  void api.searchStories({ q: "ai", language: "en" });
  // @ts-expect-error Declared parameters keep their types.
  void api.searchStories({ size: "5" });
  // @ts-expect-error Extra values must be serializable as a query parameter.
  void api.searchStories({ extraParams: { nested: { a: 1 } } });

  const extra: ExtraQueryParams = { a: undefined };
  void extra;

  const field = {} as SignalMonitoringPlanDataSchemaSchemaValue;
  if (field.type === "ENUM") {
    field.values satisfies string[];
  }
  if (field.type === "ARRAY") {
    field.element.type satisfies Exclude<
      SignalMonitoringPlanDataSchemaSchemaValue["type"],
      "ARRAY"
    >;
    // @ts-expect-error Arrays cannot contain arrays.
    field.element.type satisfies "ARRAY";
  }

  // @ts-expect-error ENUM requires values.
  const enumWithoutValues: SignalMonitoringPlanDataSchemaSchemaValue = {
    type: "ENUM",
  };
  void enumWithoutValues;
}

describe("types", () => {
  it("are checked by tsc", () => {
    expect(typeChecks).toBeInstanceOf(Function);
  });
});
