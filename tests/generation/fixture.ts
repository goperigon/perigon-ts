// Covers the constructs the Perigon spec only partly exercises.
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

export const spec = {
  openapi: "3.0.1",
  info: { title: "Fixture", version: "1.0.0" },
  paths: {
    "/owners": {
      get: {
        operationId: "getOwner",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: ref("Owner") } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["DOG", "CAT", "BIRD"] },
          name: { type: "string" },
        },
        discriminator: {
          propertyName: "kind",
          mapping: {
            DOG: "#/components/schemas/Dog",
            CAT: "#/components/schemas/Cat",
            BIRD: "#/components/schemas/Bird",
          },
        },
      },
      Dog: {
        allOf: [
          ref("Pet"),
          {
            type: "object",
            required: ["barks"],
            properties: { barks: { type: "boolean" } },
          },
        ],
      },
      Cat: {
        allOf: [
          ref("Pet"),
          { type: "object", properties: { lives: { type: "integer" } } },
        ],
      },
      Bird: { allOf: [ref("Pet"), { type: "object" }] },
      Mammal: {
        oneOf: [ref("Dog"), ref("Cat")],
        discriminator: {
          propertyName: "kind",
          mapping: {
            DOG: "#/components/schemas/Dog",
            CAT: "#/components/schemas/Cat",
          },
        },
      },
      Anything: {
        oneOf: [
          ref("Dog"),
          { type: "array", items: ref("Cat") },
          { type: "array", items: { type: "boolean" } },
          { type: "string" },
          { type: "integer" },
        ],
      },
      Owner: {
        type: "object",
        properties: {
          mammal: ref("Mammal"),
          anything: ref("Anything"),
          mammals: { type: "object", additionalProperties: ref("Mammal") },
        },
      },
    },
  },
};
