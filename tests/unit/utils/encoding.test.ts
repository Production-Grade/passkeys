import { describe, it, expect } from '@jest/globals';
import {
  base64urlToUint8Array,
  uint8ArrayToBase64url,
  base64urlToBuffer,
  bufferToBase64url,
  arrayBufferToBase64url,
  base64urlToArrayBuffer,
  isValidBase64url,
} from '../../../src/core/utils/encoding';

describe('Encoding Utilities', () => {
  describe('base64urlToUint8Array', () => {
    it('should convert base64url string to Uint8Array', () => {
      const base64url = 'SGVsbG8gV29ybGQ';
      const result = base64urlToUint8Array(base64url);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = base64urlToUint8Array('');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should handle valid base64url characters', () => {
      const base64url = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const result = base64urlToUint8Array(base64url);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should handle padding correctly', () => {
      const base64url = 'SGVsbG8'; // No padding needed
      const result = base64urlToUint8Array(base64url);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('uint8ArrayToBase64url', () => {
    it('should convert Uint8Array to base64url string', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      const result = uint8ArrayToBase64url(data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty Uint8Array', () => {
      const data = new Uint8Array([]);
      const result = uint8ArrayToBase64url(data);
      expect(result).toBe('');
    });

    it('should round-trip correctly', () => {
      const original = 'SGVsbG8gV29ybGQ';
      const uint8Array = base64urlToUint8Array(original);
      const result = uint8ArrayToBase64url(uint8Array);
      expect(result).toBe(original);
    });

    it('should not include padding characters', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      const result = uint8ArrayToBase64url(data);
      expect(result).not.toContain('=');
    });
  });

  describe('base64urlToBuffer', () => {
    it('should convert base64url string to Buffer', () => {
      const base64url = 'SGVsbG8gV29ybGQ';
      const result = base64urlToBuffer(base64url);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = base64urlToBuffer('');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should round-trip correctly', () => {
      const original = Buffer.from('Hello World');
      const base64url = bufferToBase64url(original);
      const result = base64urlToBuffer(base64url);
      expect(result.toString()).toBe(original.toString());
    });
  });

  describe('bufferToBase64url', () => {
    it('should convert Buffer to base64url string', () => {
      const buffer = Buffer.from('Hello World');
      const result = bufferToBase64url(buffer);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty Buffer', () => {
      const buffer = Buffer.from('');
      const result = bufferToBase64url(buffer);
      expect(result).toBe('');
    });

    it('should not include padding characters', () => {
      const buffer = Buffer.from('Hello');
      const result = bufferToBase64url(buffer);
      expect(result).not.toContain('=');
    });
  });

  describe('arrayBufferToBase64url', () => {
    it('should convert ArrayBuffer to base64url string', () => {
      const buffer = new ArrayBuffer(5);
      const view = new Uint8Array(buffer);
      view.set([72, 101, 108, 108, 111]);
      const result = arrayBufferToBase64url(buffer);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty ArrayBuffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = arrayBufferToBase64url(buffer);
      expect(result).toBe('');
    });
  });

  describe('base64urlToArrayBuffer', () => {
    it('should convert base64url string to ArrayBuffer', () => {
      const base64url = 'SGVsbG8gV29ybGQ';
      const result = base64urlToArrayBuffer(base64url);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = base64urlToArrayBuffer('');
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(0);
    });

    it('should round-trip correctly', () => {
      const original = new ArrayBuffer(5);
      const view = new Uint8Array(original);
      view.set([72, 101, 108, 108, 111]);
      const base64url = arrayBufferToBase64url(original);
      const result = base64urlToArrayBuffer(base64url);
      
      const originalView = new Uint8Array(original);
      const resultView = new Uint8Array(result);
      expect(resultView).toEqual(originalView);
    });
  });

  describe('isValidBase64url', () => {
    it('should return true for valid base64url strings', () => {
      expect(isValidBase64url('SGVsbG8gV29ybGQ')).toBe(true);
      expect(isValidBase64url('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')).toBe(true);
      expect(isValidBase64url('a')).toBe(true);
      expect(isValidBase64url('-_')).toBe(true);
    });

    it('should return false for invalid base64url strings', () => {
      expect(isValidBase64url('SGVsbG8gV29ybGQ=')).toBe(false); // Contains padding
      expect(isValidBase64url('SGVsbG8gV29ybGQ+')).toBe(false); // Contains +
      expect(isValidBase64url('SGVsbG8gV29ybGQ/')).toBe(false); // Contains /
      expect(isValidBase64url('Hello World!')).toBe(false); // Contains space and !
      expect(isValidBase64url('')).toBe(false); // Empty string is invalid (regex requires at least one char)
    });
  });
});
