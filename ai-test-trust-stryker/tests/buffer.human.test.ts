import { vi } from 'vitest'
import { bufferToFormData, timingSafeEqual } from './buffer'

/**
 * Human-review tests — Phase 5 of AI-test-trust study.
 *
 * These are NOT replacements for the existing human or AI tests. They target
 * specific surviving mutants in `combined` that require a contract-level
 * assertion (spy, exact header value, asymmetric guard) rather than
 * input/output equality alone.
 */

describe('timingSafeEqual - custom hash function contract (human review)', () => {
  // Targets L49:7 ConditionalExpression → true (`if (!hashFunction) hashFunction = sha256`).
  // Contract: when the caller supplies a hashFunction, that function MUST be
  // invoked for both inputs. A test that only asserts the boolean return value
  // cannot distinguish "called the custom fn" from "fell back to sha256 and
  // happened to match"; only a spy pins the dispatch contract.
  // Evidence: `StringHashFunction` type at buffer.ts:42 and the explicit
  // `hashFunction?: StringHashFunction` parameter — the parameter would be
  // dead API if the implementation silently replaced it.
  it('invokes the caller-supplied hashFunction for both inputs (not sha256 fallback)', async () => {
    const spy = vi.fn(async (input: string) => `H(${input})`)
    const result = await timingSafeEqual('alpha', 'alpha', spy)
    expect(result).toBe(true)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, 'alpha')
    expect(spy).toHaveBeenNthCalledWith(2, 'alpha')
  })

  // Targets the L55:7 precedence-rewrite cluster (mutants #10, #12, #13 in
  // survivor-classification.md): guards like
  //   `(sa == null || sb == null) && typeof sa !== 'string'`
  //   `sa == null && sb == null`
  // When only ONE side of the hash returns null, the original guard fires and
  // returns `false`; the rewritten mutant falls through to
  // `constantTimeEqualString(sa, sb)` where `null.length` throws a TypeError
  // and the promise rejects.
  // Contract: a hashFunction that returns null (documented via the
  // `string | null | Promise<string | null>` return type at buffer.ts:42) must
  // yield `false`, never a rejected promise, regardless of which side is null.
  it('returns false (does not throw) when hashFunction returns null for only one input', async () => {
    const hashSaNull = vi.fn(async (input: string) => (input === 'left' ? null : 'VALID'))
    await expect(timingSafeEqual('left', 'right', hashSaNull)).resolves.toBe(false)

    const hashSbNull = vi.fn(async (input: string) => (input === 'right' ? null : 'VALID'))
    await expect(timingSafeEqual('left', 'right', hashSbNull)).resolves.toBe(false)
  })
})

describe('bufferToFormData - Content-Type normalisation (human review)', () => {
  // Targets L113:68 MethodExpression `toLowerCase → toUpperCase` AND
  // L113:43 Regex mutants `/^[^;]/` and `/^[;]+/`.
  // Contract: the media type portion of the Content-Type is normalised to
  // lowercase (RFC 9110 §8.3.2 — media types are case-insensitive, lowercase
  // is the canonical form Hono emits), and parameters (boundary) are
  // preserved verbatim (RFC 2046 §5.1.1 — boundary values are case-sensitive).
  // The in-code comment at buffer.ts:112 states this explicitly:
  //   "Normalize the media type (case-insensitive) while keeping parameters
  //    like the boundary"
  // The downstream runtime (undici/Response.formData) is itself
  // case-insensitive, so a boolean "did parsing succeed" assertion cannot
  // discriminate the mutants — we must spy on the Response constructor and
  // assert the exact header value produced.
  it('lowercases the full media type and preserves the boundary parameter verbatim', async () => {
    const ResponseCtor = globalThis.Response
    const captured: Array<{ body: unknown; init: ResponseInit | undefined }> = []
    class ResponseSpy extends ResponseCtor {
      constructor(body?: BodyInit | null, init?: ResponseInit) {
        captured.push({ body, init })
        super(body, init)
      }
    }
    // @ts-expect-error — test-only replacement
    globalThis.Response = ResponseSpy
    try {
      const boundary = 'XyZ-Boundary-123'
      const body = `--${boundary}\r\nContent-Disposition: form-data; name="k"\r\n\r\nv\r\n--${boundary}--\r\n`
      const buffer = new TextEncoder().encode(body).buffer as ArrayBuffer
      const form = await bufferToFormData(
        buffer,
        `MULTIPART/FORM-DATA; boundary=${boundary}`
      )
      // Primary assertion: lowercase media type, boundary preserved exactly.
      expect(captured).toHaveLength(1)
      const headers = (captured[0].init as { headers: Record<string, string> }).headers
      expect(headers['Content-Type']).toBe(`multipart/form-data; boundary=${boundary}`)
      // Sanity: parsing still works (functional invariant).
      expect(form.get('k')).toBe('v')
    } finally {
      globalThis.Response = ResponseCtor
    }
  })
})
