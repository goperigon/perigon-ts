/**
 * Perigon SDK Usage for Webhooks Example
 *
 * This example demonstrates how to use the Perigon TypeScript SDK to verify webhook signatures.
 *
 * Before running: Set PERIGON_WEBHOOK_SECRET environment variable
 * Run: node examples/webhooks.js
 */

import { Webhooks, WEBHOOK_HEADER } from "@goperigon/perigon-ts";
import * as dotenv from "dotenv";
import express from "express";

// Load environment variables from .env file
dotenv.config();

const secret = process.env.PERIGON_WEBHOOK_SECRET || "";

const webhooks = new Webhooks();

const app = express();

app.post(
  "/webhook",
  // The express.raw middleware keeps the request body unparsed, this is necessary for the signature verification process
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers[WEBHOOK_HEADER];
    try {
      const event = await webhooks.constructEventAsync(
        req.body,
        signature,
        secret,
      );
      return res.sendStatus(200).end();
    } catch (error) {
      console.error(error);
      return res.sendStatus(400).end();
    }
  },
);

const port = 3000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
