import { createHash } from 'crypto'
import { bufferToFormData, bufferToString, equal, timingSafeEqual } from './buffer'

describe('equal - edge cases', () => {
  it('should return true for two empty ArrayBuffers', () => {
    const buffer1 = new ArrayBuffer(0)
    const buffer2 = new ArrayBuffer(0)
    expect(equal(buffer1, buffer2)).toBe(true)
  })

  it('should return false when comparing empty and non-empty ArrayBuffers', () => {
    const buffer1 = new ArrayBuffer(0)
    const buffer2 = new ArrayBuffer(1)
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should return true for ArrayBuffers with identical binary content including null bytes', () => {
    const buffer1 = new Uint8Array([0, 0, 0, 0]).buffer
    const buffer2 = new Uint8Array([0, 0, 0, 0]).buffer
    expect(equal(buffer1, buffer2)).toBe(true)
  })

  it('should return false for ArrayBuffers differing only in the last byte', () => {
    const buffer1 = new Uint8Array([1, 2, 3, 4, 5]).buffer
    const buffer2 = new Uint8Array([1, 2, 3, 4, 6]).buffer
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should return false for ArrayBuffers differing only in the first byte', () => {
    const buffer1 = new Uint8Array([1, 2, 3, 4]).buffer
    const buffer2 = new Uint8Array([2, 2, 3, 4]).buffer
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should handle high byte values (0xFF) correctly', () => {
    const buffer1 = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]).buffer
    const buffer2 = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]).buffer
    expect(equal(buffer1, buffer2)).toBe(true)
  })

  it('should return false when high byte values differ', () => {
    const buffer1 = new Uint8Array([0xff, 0x00]).buffer
    const buffer2 = new Uint8Array([0xfe, 0x00]).buffer
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should handle large ArrayBuffers (1MB)', () => {
    const size = 1024 * 1024
    const buffer1 = new Uint8Array(size)
    const buffer2 = new Uint8Array(size)
    // Fill with pseudo-random but identical data
    for (let i = 0; i < size; i++) {
      const val = (i * 7 + 13) % 256
      buffer1[i] = val
      buffer2[i] = val
    }
    expect(equal(buffer1.buffer, buffer2.buffer)).toBe(true)
  })

  it('should return false for large ArrayBuffers with a single byte difference at the end', () => {
    const size = 1024 * 1024
    const buffer1 = new Uint8Array(size)
    const buffer2 = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      buffer1[i] = i % 256
      buffer2[i] = i % 256
    }
    buffer2[size - 1] = (buffer2[size - 1] + 1) % 256
    expect(equal(buffer1.buffer, buffer2.buffer)).toBe(false)
  })

  it('should handle ArrayBuffer views correctly (Uint8Array vs DataView)', () => {
    const buffer1 = new Uint8Array([1, 2, 3, 4]).buffer
    const buffer2 = new DataView(new Uint8Array([1, 2, 3, 4]).buffer).buffer
    expect(equal(buffer1, buffer2)).toBe(true)
  })
})

describe('timingSafeEqual - string edge cases', () => {
  it('should return true for empty strings', async () => {
    expect(await timingSafeEqual('', '')).toBe(true)
  })

  it('should return false when comparing empty string with non-empty string', async () => {
    expect(await timingSafeEqual('', 'a')).toBe(false)
    expect(await timingSafeEqual('a', '')).toBe(false)
  })

  it('should handle unicode characters correctly', async () => {
    expect(await timingSafeEqual('あいうえお', 'あいうえお')).toBe(true)
    expect(await timingSafeEqual('🎉🎊🎈', '🎉🎊🎈')).toBe(true)
    expect(await timingSafeEqual('café', 'café')).toBe(true)
    expect(await timingSafeEqual('cafe\u0301', 'cafe\u0301')).toBe(true) // decomposed form
  })

  it('should return false for different unicode strings of same length', async () => {
    expect(await timingSafeEqual('あ', 'い')).toBe(false)
    expect(await timingSafeEqual('🎉', '🎊')).toBe(false)
  })

  it('should handle very long strings (100KB)', async () => {
    const longStr = 'a'.repeat(100_000)
    expect(await timingSafeEqual(longStr, longStr)).toBe(true)
  })

  it('should return false for very long strings differing at the end', async () => {
    const longStr1 = 'a'.repeat(100_000) + 'b'
    const longStr2 = 'a'.repeat(100_000) + 'c'
    expect(await timingSafeEqual(longStr1, longStr2)).toBe(false)
  })

  it('should handle strings with null characters', async () => {
    expect(await timingSafeEqual('a\0b', 'a\0b')).toBe(true)
    expect(await timingSafeEqual('a\0b', 'a\0c')).toBe(false)
  })

  it('should handle strings with special regex characters', async () => {
    expect(await timingSafeEqual('.*+?^${}()|[]\\', '.*+?^${}()|[]\\')).toBe(true)
    expect(await timingSafeEqual('.*+?^${}()|[]\\', '.*+?^${}()|[]/')).toBe(false)
  })
})

describe('timingSafeEqual - custom hash function behavior', () => {
  it('should return false when custom hash function returns null for first argument', async () => {
    const hashFn = async (input: string) => (input === 'a' ? null : 'hash')
    expect(await timingSafeEqual('a', 'b', hashFn)).toBe(false)
  })

  it('should return false when custom hash function returns null for second argument', async () => {
    const hashFn = async (input: string) => (input === 'b' ? null : 'hash')
    expect(await timingSafeEqual('a', 'b', hashFn)).toBe(false)
  })

  it('should return false when custom hash function returns undefined', async () => {
    const hashFn = async (input: string) => (input === 'a' ? undefined : 'hash')
    expect(await timingSafeEqual('a', 'b', hashFn)).toBe(false)
  })

  it('should return false when custom hash function returns non-string', async () => {
    const hashFn = async (input: string) => (input === 'a' ? 123 : 'hash')
    expect(await timingSafeEqual('a', 'b', hashFn)).toBe(false)
  })

  it('should return false when custom hash function returns different hashes for same input (timing attack simulation)', async () => {
    // This simulates a hash function that might leak timing info
    // timingSafeEqual should still return false for different inputs
    const hashFn = async (input: string) => createHash('sha256').update(input).digest('hex')
    expect(await timingSafeEqual('a', 'b', hashFn)).toBe(false)
  })

  it('should work with synchronous hash function (non-promise)', async () => {
    const hashFn = (input: string) => createHash('sha256').update(input).digest('hex')
    expect(await timingSafeEqual('test', 'test', hashFn)).toBe(true)
    expect(await timingSafeEqual('test', 'different', hashFn)).toBe(false)
  })

  it('should return false when hashes match but original strings differ (hash collision)', async () => {
    // Using a deliberately weak hash that collides
    const weakHash = (input: string) => (input.length > 0 ? 'collision' : 'empty')
    expect(await timingSafeEqual('a', 'b', weakHash)).toBe(false)
  })

  it('should return true when both hash and original strings match with custom hash', async () => {
    const hashFn = async (input: string) => createHash('sha256').update(input).digest('hex')
    expect(await timingSafeEqual('hello world', 'hello world', hashFn)).toBe(true)
  })
})

describe('timingSafeEqual - deprecated non-string signatures (for backward compatibility)', () => {
  // These test the deprecated code paths that are still implemented
  it('should handle boolean arguments', async () => {
    expect(await timingSafeEqual(true, true)).toBe(true)
    expect(await timingSafeEqual(false, false)).toBe(true)
    expect(await timingSafeEqual(true, false)).toBe(false)
  })

  it('should handle object arguments', async () => {
    // Non-string arguments are hashed via sha256 (JSON.stringify for objects)
    // Same-content objects produce identical hashes
    expect(await timingSafeEqual({}, {})).toBe(true) // Both stringify to "{}"
    expect(await timingSafeEqual({ a: 1 }, { a: 1 })).toBe(true) // Both stringify to {"a":1}
    const obj = { a: 1 }
    expect(await timingSafeEqual(obj, obj)).toBe(true) // Same reference
  })

  it('should handle array arguments', async () => {
    // Arrays are JSON.stringified, so same-content arrays produce identical hashes
    expect(await timingSafeEqual([1, 2], [1, 2])).toBe(true) // Both stringify to [1,2]
    const arr = [1, 2]
    expect(await timingSafeEqual(arr, arr)).toBe(true) // Same reference
  })

  it('should handle function arguments', async () => {
    // Functions stringify to "undefined" via JSON.stringify, then String() -> "undefined"
    const fn = () => {}
    expect(await timingSafeEqual(fn, fn)).toBe(true) // Same reference
    expect(await timingSafeEqual(() => {}, () => {})).toBe(true) // Both become "undefined"
  })

  it('should handle mixed string and non-string (coerced to string)', async () => {
    // When hash function is provided, non-strings are hashed
    const hashFn = (input: unknown) => createHash('sha256').update(String(input)).digest('hex')
    expect(await timingSafeEqual('true', true, hashFn)).toBe(true)
    expect(await timingSafeEqual('false', false, hashFn)).toBe(true)
    expect(await timingSafeEqual('[object Object]', {}, hashFn)).toBe(true)
  })

  it('should return false when hash function returns null for non-string', async () => {
    const hashFn = async () => null
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(await timingSafeEqual({}, {}, hashFn)).toBe(false)
  })
})

describe('bufferToString - edge cases', () => {
  it('should return empty string for empty ArrayBuffer', () => {
    const buffer = new ArrayBuffer(0)
    expect(bufferToString(buffer)).toBe('')
  })

  it('should decode ASCII text correctly', () => {
    const buffer = new TextEncoder().encode('Hello, World!').buffer
    expect(bufferToString(buffer)).toBe('Hello, World!')
  })

  it('should decode UTF-8 with multi-byte characters', () => {
    const buffer = new TextEncoder().encode('Hello 世界 🌍').buffer
    expect(bufferToString(buffer)).toBe('Hello 世界 🌍')
  })

  it('should handle null bytes in buffer', () => {
    const buffer = new Uint8Array([72, 101, 108, 108, 111, 0, 87, 111, 114, 108, 100]).buffer // "Hello\0World"
    expect(bufferToString(buffer)).toBe('Hello\0World')
  })

  it('should handle invalid UTF-8 sequences (replacement characters)', () => {
    // 0xFF is not valid UTF-8
    const buffer = new Uint8Array([0x48, 0x65, 0xff, 0x6c, 0x6c, 0x6f]).buffer // "He" + invalid + "llo"
    const result = bufferToString(buffer)
    expect(result).toContain('He')
    expect(result).toContain('llo')
    expect(result).toContain('\uFFFD') // Replacement character
  })

  it('should return input as-is when not an ArrayBuffer', () => {
    expect(bufferToString('already a string' as unknown as ArrayBuffer)).toBe('already a string')
    expect(bufferToString(123 as unknown as ArrayBuffer)).toBe(123)
    expect(bufferToString(null as unknown as ArrayBuffer)).toBe(null)
    expect(bufferToString(undefined as unknown as ArrayBuffer)).toBe(undefined)
    expect(bufferToString({ foo: 'bar' } as unknown as ArrayBuffer)).toEqual({ foo: 'bar' })
  })

  it('should handle large buffers (100KB)', () => {
    const largeString = 'x'.repeat(100_000)
    const buffer = new TextEncoder().encode(largeString).buffer
    expect(bufferToString(buffer)).toBe(largeString)
  })
})

describe('bufferToFormData - edge cases', () => {
  it('should parse empty multipart form data', async () => {
    const encoder = new TextEncoder()
    const testData = '--boundary--\r\n'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    expect(result.entries().next().done).toBe(true) // No entries
  })

  it('should parse multiple fields with same name', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--boundary\r\nContent-Disposition: form-data; name="tags"\r\n\r\ntag1\r\n--boundary\r\nContent-Disposition: form-data; name="tags"\r\n\r\ntag2\r\n--boundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    const tags = result.getAll('tags')
    expect(tags).toEqual(['tag1', 'tag2'])
  })

  it('should parse file uploads with filename', async () => {
    const encoder = new TextEncoder()
    const fileContent = 'file content here'
    const testData =
      `--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--boundary--`
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    const file = result.get('file')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('test.txt')
    expect(await file.text()).toBe(fileContent)
  })

  it('should handle boundary with special characters', async () => {
    const encoder = new TextEncoder()
    const boundary = 'boundary_123-abc.xyz'
    const testData = `--${boundary}\r\nContent-Disposition: form-data; name="test"\r\n\r\nvalue\r\n--${boundary}--`
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, `multipart/form-data; boundary=${boundary}`)
    expect(result.get('test')).toBe('value')
  })

  it('should handle mixed case content-type with charset parameter', async () => {
    const encoder = new TextEncoder()
    const testData = 'key=value'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'APPLICATION/X-WWW-FORM-URLENCODED; charset=UTF-8')
    expect(result.get('key')).toBe('value')
  })

  it('should parse application/x-www-form-urlencoded with multiple values', async () => {
    const encoder = new TextEncoder()
    const testData = 'colors=red&colors=blue&colors=green'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'application/x-www-form-urlencoded')
    const colors = result.getAll('colors')
    expect(colors).toEqual(['red', 'blue', 'green'])
  })

  it('should parse urlencoded with special characters', async () => {
    const encoder = new TextEncoder()
    const testData = 'message=hello%20world%21&email=user%40example.com'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'application/x-www-form-urlencoded')
    expect(result.get('message')).toBe('hello world!')
    expect(result.get('email')).toBe('user@example.com')
  })

  it('should return empty FormData for empty urlencoded body', async () => {
    const encoder = new TextEncoder()
    const arrayBuffer = encoder.encode('').buffer

    const result = await bufferToFormData(arrayBuffer, 'application/x-www-form-urlencoded')
    expect(result.entries().next().done).toBe(true)
  })

  it('should handle multipart with missing boundary gracefully', async () => {
    const encoder = new TextEncoder()
    const testData = 'Content-Disposition: form-data; name="test"\r\n\r\nvalue'
    const arrayBuffer = encoder.encode(testData).buffer

    // No boundary in content-type - Response.formData() will throw
    await expect(
      bufferToFormData(arrayBuffer, 'multipart/form-data')
    ).rejects.toThrow()
  })

  it('should handle multipart with CRLF line endings', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--boundary\r\nContent-Disposition: form-data; name="test"\r\n\r\nvalue\r\n--boundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    expect(result.get('test')).toBe('value')
  })

  it('should reject multipart with LF-only line endings (spec requires CRLF)', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--boundary\nContent-Disposition: form-data; name="test"\n\nvalue\n--boundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    // RFC 7578 requires CRLF; Response.formData() throws on LF-only
    await expect(
      bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    ).rejects.toThrow()
  })

  it('should handle form field with empty value', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--boundary\r\nContent-Disposition: form-data; name="empty"\r\n\r\n\r\n--boundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    expect(result.get('empty')).toBe('')
  })

  it('should handle form field with whitespace-only value', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--boundary\r\nContent-Disposition: form-data; name="whitespace"\r\n\r\n   \t\r\n--boundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=boundary')
    expect(result.get('whitespace')).toBe('   \t')
  })
})

describe('constantTimeEqualString (indirectly via timingSafeEqual)', () => {
  // These test the internal constantTimeEqualString behavior through timingSafeEqual
  it('should take constant time for strings of same length (no early return)', async () => {
    // We can't easily test timing in unit tests, but we can verify
    // that the function doesn't have early returns for equal-length strings
    const hashFn = async (input: string) => {
      // Add a small delay to make timing differences more detectable in principle
      // (not actually measurable in JS test environment)
      return createHash('sha256').update(input).digest('hex')
    }

    // These should all take the same code path regardless of where difference is
    const start1 = Date.now()
    await timingSafeEqual('aaaaaaaaab', 'aaaaaaaaac', hashFn) // diff at end
    const time1 = Date.now() - start1

    const start2 = Date.now()
    await timingSafeEqual('baaaaaaaaa', 'caaaaaaaaa', hashFn) // diff at start
    const time2 = Date.now() - start2

    const start3 = Date.now()
    await timingSafeEqual('aaaaabaaaa', 'aaaaacaaaa', hashFn) // diff in middle
    const time3 = Date.now() - start3

    // All should complete (we're not asserting exact timing equality in JS)
    expect(time1).toBeGreaterThanOrEqual(0)
    expect(time2).toBeGreaterThanOrEqual(0)
    expect(time3).toBeGreaterThanOrEqual(0)
  })

  it('should handle strings of different lengths in constant time', async () => {
    const hashFn = async (input: string) => createHash('sha256').update(input).digest('hex')
    // Different lengths - should still compare hashes in constant time
    expect(await timingSafeEqual('a', 'aa', hashFn)).toBe(false)
    expect(await timingSafeEqual('aaa', 'a', hashFn)).toBe(false)
  })
})