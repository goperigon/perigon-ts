import { WEBHOOK_HEADER } from "./constants";
import type { CryptoProvider } from "./CryptoProvider";
import type { WebhookHeader, WebhookPayload } from "./types";

const EXPECTED_SIGNATURE_KEY = "v1";
const EXPECTED_TIMESTAMP_KEY = "t";

const SIGNATURE_NOT_MATH_ERROR =
  "Signature hash does not match the expected signature hash for payload.";
const OUTSIDE_TOLERANCE_ZONE_ERROR = "Timestamp outside the tolerance zone.";

export class SignatureVerificationError extends Error {}

export class WebhookSignatureProvider {
  private readonly decoder = new TextDecoder("utf8");

  constructor(private readonly cryptoProvider: CryptoProvider) {}

  public verifyHeader(
    payload: WebhookPayload,
    header: WebhookHeader,
    secret: string,
    tolerance: number,
  ): void {
    const { signature, timestamp } = this.parseHeader(header);

    if (timestamp < Date.now() - tolerance) {
      throw new SignatureVerificationError(OUTSIDE_TOLERANCE_ZONE_ERROR);
    }

    const expectedSignature = this.computeSignature(payload, timestamp, secret);

    if (!this.cryptoProvider.secureCompare(expectedSignature, signature)) {
      throw new SignatureVerificationError(SIGNATURE_NOT_MATH_ERROR);
    }
  }

  public async verifyHeaderAsync(
    payload: WebhookPayload,
    header: WebhookHeader,
    secret: string,
    tolerance: number,
  ): Promise<void> {
    const { signature, timestamp } = this.parseHeader(header);

    if (timestamp < Date.now() - tolerance) {
      throw new SignatureVerificationError(OUTSIDE_TOLERANCE_ZONE_ERROR);
    }

    const expectedSignature = await this.computeSignatureAsync(
      payload,
      timestamp,
      secret,
    );

    if (!this.cryptoProvider.secureCompare(expectedSignature, signature)) {
      throw new SignatureVerificationError(SIGNATURE_NOT_MATH_ERROR);
    }
  }

  private parseHeader(header: WebhookHeader): {
    signature: string;
    timestamp: number;
  } {
    if (header == null || header == "") {
      throw new SignatureVerificationError(
        `No ${WEBHOOK_HEADER} header value was provided.`,
      );
    }

    if (Array.isArray(header)) {
      throw new SignatureVerificationError(
        `Unexpected: An array was passed as a header, which should not be possible for the ${WEBHOOK_HEADER} header.`,
      );
    }

    const decoded =
      header instanceof Uint8Array ? this.decoder.decode(header) : header;

    const [t, v] = decoded.split(",");

    if (typeof t === "undefined" || typeof v === "undefined") {
      throw new SignatureVerificationError("Signature or timestamp missing");
    }

    const [timestampKey, timestampStr] = t.split("=");
    const timestamp = parseInt(timestampStr, 10);

    if (timestampKey !== EXPECTED_TIMESTAMP_KEY || Number.isNaN(timestamp)) {
      throw new SignatureVerificationError(
        "Unable to extract timestamp from header",
      );
    }

    const [signatureKey, signature] = v.split("=");

    if (signatureKey !== EXPECTED_SIGNATURE_KEY || !signature) {
      throw new SignatureVerificationError(
        "No signature found with expected schema.",
      );
    }

    return { signature, timestamp };
  }

  private computeSignedPayload(payload: WebhookPayload, timestamp: number) {
    if (!payload) {
      throw new SignatureVerificationError("No webhook payload was provided.");
    }

    const signable =
      payload instanceof Uint8Array ? this.decoder.decode(payload) : payload;
    return `${timestamp}.${signable}`;
  }

  private computeSignature(
    payload: WebhookPayload,
    timestamp: number,
    secret: string,
  ): string {
    const signedPayload = this.computeSignedPayload(payload, timestamp);
    return this.cryptoProvider.computeHMACSignature(signedPayload, secret);
  }

  private async computeSignatureAsync(
    payload: WebhookPayload,
    timestamp: number,
    secret: string,
  ): Promise<string> {
    const signedPayload = this.computeSignedPayload(payload, timestamp);
    return await this.cryptoProvider.computeHMACSignatureAsync(
      signedPayload,
      secret,
    );
  }
}
