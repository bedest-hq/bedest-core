export interface IScrubOptions {
  /** Additional key fragments to redact (matched like the built-in list). */
  extraKeys?: readonly string[];
}

export class UtilAudit {
  /**
   * Normalized fragments: a key is redacted when its normalized form
   * (lower-case, `_` and `-` removed) contains any of them.
   */
  private static readonly SENSITIVE_FRAGMENTS: readonly string[] = [
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "apikey",
    "authorization",
    "cookie",
    "session",
    "creditcard",
    "cardnumber",
    "cvv",
    "cvc",
    "iban",
    "ssn",
    "otp",
    "pin",
  ];

  private static readonly MAX_DEPTH = 5;

  static readonly REDACTED = "********";

  static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[_-]/g, "");
  }

  static isSensitiveKey(key: string, extraKeys: readonly string[] = []): boolean {
    const normalized = UtilAudit.normalizeKey(key);
    const fragments = [
      ...UtilAudit.SENSITIVE_FRAGMENTS,
      ...extraKeys.map((k) => UtilAudit.normalizeKey(k)),
    ];
    return fragments.some(
      (fragment) => fragment.length > 0 && normalized.includes(fragment),
    );
  }

  /**
   * Returns a JSON-safe copy of `data` with sensitive values redacted.
   * Dates become ISO strings, Maps objects, Sets arrays, binary data a size
   * marker, and circular references `"[CIRCULAR]"`.
   */
  static scrub(data: unknown, options: IScrubOptions = {}): unknown {
    return UtilAudit.walk(data, 0, new WeakSet<object>(), options.extraKeys ?? []);
  }

  private static walk(
    data: unknown,
    depth: number,
    ancestors: WeakSet<object>,
    extraKeys: readonly string[],
  ): unknown {
    if (depth > UtilAudit.MAX_DEPTH) {
      return "[MAX_DEPTH_REACHED]";
    }

    if (typeof data === "bigint") {
      return data.toString();
    }

    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (data instanceof Date) {
      return Number.isNaN(data.getTime()) ? "[INVALID_DATE]" : data.toISOString();
    }

    if (data instanceof Blob) {
      const fileName = data instanceof File ? data.name : "unknown_blob";
      return `[FILE/BLOB: ${fileName}]`;
    }

    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      return `[BINARY ${data.byteLength} bytes]`;
    }

    if (ancestors.has(data)) {
      return "[CIRCULAR]";
    }

    ancestors.add(data);
    try {
      if (Array.isArray(data)) {
        return data.map((item) =>
          UtilAudit.walk(item, depth + 1, ancestors, extraKeys),
        );
      }

      if (data instanceof Set) {
        return [...data].map((item) =>
          UtilAudit.walk(item, depth + 1, ancestors, extraKeys),
        );
      }

      const entries: Array<[string, unknown]> =
        data instanceof Map
          ? [...data.entries()].map(([k, v]) => [String(k), v])
          : Object.entries(data);

      const scrubbed: Record<string, unknown> = {};
      for (const [key, value] of entries) {
        scrubbed[key] = UtilAudit.isSensitiveKey(key, extraKeys)
          ? UtilAudit.REDACTED
          : UtilAudit.walk(value, depth + 1, ancestors, extraKeys);
      }
      return scrubbed;
    } finally {
      ancestors.delete(data);
    }
  }
}
