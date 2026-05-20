import { type CryptoProvider, SubtleCryptoProvider } from "./CryptoProvider";
import type { WebhookHeader, WebhookPayload } from "./types";
import { type WebhookEvent, WebhookEventSchema } from "./WebhookEvent";
import { WebhookSignatureProvider } from "./WebhookSignatureProvider";

const DEFAULT_TOLERANCE = 5 * 60 * 1000; // 5 minutes

export class Webhooks {
  private readonly decoder = new TextDecoder("utf8");
  private readonly signatureProvider: WebhookSignatureProvider;

  public constructor(cryptoProvider?: CryptoProvider) {
    this.signatureProvider = new WebhookSignatureProvider(
      cryptoProvider ?? new SubtleCryptoProvider(),
    );
  }

  public constructEvent(
    payload: WebhookPayload,
    header: WebhookHeader,
    secret: string,
    tolerance?: number,
  ): WebhookEvent {
    this.signatureProvider.verifyHeader(
      payload,
      header,
      secret,
      tolerance ?? DEFAULT_TOLERANCE,
    );
    const webhookPayload = this.parseVerifiedPayload(payload);
    return WebhookEventSchema.parse(webhookPayload);
  }

  public async constructEventAsync(
    payload: WebhookPayload,
    header: WebhookHeader,
    secret: string,
    tolerance?: number,
  ): Promise<WebhookEvent> {
    await this.signatureProvider.verifyHeaderAsync(
      payload,
      header,
      secret,
      tolerance ?? DEFAULT_TOLERANCE,
    );
    const webhookPayload = this.parseVerifiedPayload(payload);
    return WebhookEventSchema.parseAsync(webhookPayload);
  }

  private parseVerifiedPayload(payload: WebhookPayload): unknown {
    return payload instanceof Uint8Array
      ? JSON.parse(this.decoder.decode(payload))
      : JSON.parse(payload);
  }
}
