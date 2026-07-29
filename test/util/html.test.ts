import { escapeHtml } from '../../src/util/html';

describe('escapeHtml', () => {
  test('should escape ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  test('should escape less-than', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });

  test('should escape greater-than', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  test('should escape double quote', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  test('should escape single quote', () => {
    expect(escapeHtml("a'b")).toBe('a&#39;b');
  });

  test('should escape a combined malicious string', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('should return ordinary ticker text unchanged', () => {
    expect(escapeHtml('RELIANCE')).toBe('RELIANCE');
    expect(escapeHtml('TCS')).toBe('TCS');
    expect(escapeHtml('HDFCBANK')).toBe('HDFCBANK');
  });

  test('should escape ampersand first to avoid double-encoding', () => {
    expect(escapeHtml('&<')).toBe('&amp;&lt;');
  });

  test('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
