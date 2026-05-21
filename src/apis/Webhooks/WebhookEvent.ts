import { z } from "zod";

export const WebhookEventSchema = z.object({
  signal_id: z.number(),
  signal_notification_id: z.number(),
  contact_point_notification_id: z.number(),
  sent_at: z.string().datetime(),
  metadata: z.record(z.any()),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
