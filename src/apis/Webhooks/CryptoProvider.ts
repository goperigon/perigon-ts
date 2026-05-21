export abstract class CryptoProvider {
  protected readonly encoder = new TextEncoder();

  public abstract computeHMACSignature(payload: string, secret: string): string;

  public abstract computeHMACSignatureAsync(
    payload: string,
    secret: string,
  ): Promise<string>;

  public abstract secureCompare(a: string, b: string): boolean;
}

export class SubtleCryptoProvider extends CryptoProvider {
  private readonly byteHexMapping: string[];
  private readonly subtleCrypto: SubtleCrypto;

  constructor(subtleCrypto?: SubtleCrypto) {
    super();

    // Cached mapping of byte to hex representation. We do this once to avoid re-
    // computing every time we need to convert the result of a signature to hex.
    this.byteHexMapping = new Array(256);
    for (let i = 0; i < this.byteHexMapping.length; i++) {
      this.byteHexMapping[i] = i.toString(16).padStart(2, "0");
    }

    this.subtleCrypto = subtleCrypto ?? crypto.subtle;
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  public computeHMACSignature(payload: string, secret: string): string {
    throw new Error(
      "SubtleCryptoProvider cannot be used in a synchronous context.",
    );
  }

  async computeHMACSignatureAsync(
    payload: string,
    secret: string,
  ): Promise<string> {
    const key = await this.subtleCrypto.importKey(
      "raw",
      this.encoder.encode(secret),
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"],
    );

    const signatureBuffer = await this.subtleCrypto.sign(
      "hmac",
      key,
      this.encoder.encode(payload),
    );

    // crypto.subtle returns the signature in base64 format. This must be
    // encoded in hex to match the CryptoProvider contract. We map each byte in
    // the buffer to its corresponding hex octet and then combine into a string.
    const signatureBytes = new Uint8Array(signatureBuffer);
    const signatureHexCodes = new Array(signatureBytes.length);

    for (let i = 0; i < signatureBytes.length; i++) {
      signatureHexCodes[i] = this.byteHexMapping[signatureBytes[i]];
    }

    return signatureHexCodes.join("");
  }

  private secureCompareEqualLength(a: string, b: string): boolean {
    let result = 0;
    for (let i = 0; i < a.length; ++i) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  public secureCompare(a: string, b: string): boolean {
    return a.length === b.length
      ? this.secureCompareEqualLength(a, b)
      : this.secureCompareEqualLength(a, a);
  }
}
