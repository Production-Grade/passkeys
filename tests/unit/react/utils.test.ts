/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  isWebAuthnSupported,
  formatPasskeyError,
  getDeviceTypeLabel,
  formatTransports,
  formatDate,
} from '../../../src/react/utils';
import { PasskeyError } from '../../../src/react/types';

describe('React Utilities', () => {
  describe('isWebAuthnSupported', () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // @ts-expect-error - Clearing window for testing
      delete global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should return false when window is undefined', () => {
      expect(isWebAuthnSupported()).toBe(false);
    });

    it('should return false when PublicKeyCredential is undefined', () => {
      global.window = {} as any;
      expect(isWebAuthnSupported()).toBe(false);
    });

    it('should return false when PublicKeyCredential is not a function', () => {
      global.window = {
        PublicKeyCredential: {},
      } as any;
      expect(isWebAuthnSupported()).toBe(false);
    });

    it('should return true when PublicKeyCredential is a function', () => {
      // Use a class constructor which is what PublicKeyCredential actually is
      // Set window after beforeEach has run (beforeEach deletes it)
      const MockPublicKeyCredential = class {};
      (global as any).window = {
        PublicKeyCredential: MockPublicKeyCredential,
      };
      // Also set it on the actual window object if it exists
      if (typeof window !== 'undefined') {
        (window as any).PublicKeyCredential = MockPublicKeyCredential;
      }
      expect(isWebAuthnSupported()).toBe(true);
    });
  });

  describe('formatPasskeyError', () => {
    it('should format known error codes', () => {
      const error = new PasskeyError('Test', 'WEBAUTHN_NOT_SUPPORTED');
      const formatted = formatPasskeyError(error);
      expect(formatted).toBe('Your browser does not support passkeys. Please use Chrome, Safari, Edge, or Firefox.');
    });

    it('should format USER_CANCELLED', () => {
      const error = new PasskeyError('Test', 'USER_CANCELLED');
      const formatted = formatPasskeyError(error);
      expect(formatted).toBe('You cancelled the passkey operation. Please try again.');
    });

    it('should format AUTHENTICATION_ERROR', () => {
      const error = new PasskeyError('Test', 'AUTHENTICATION_ERROR');
      const formatted = formatPasskeyError(error);
      expect(formatted).toBe('Authentication failed. Please try again.');
    });

    it('should fall back to error message for unknown codes', () => {
      const error = new PasskeyError('Custom error message', 'UNKNOWN_CODE');
      const formatted = formatPasskeyError(error);
      expect(formatted).toBe('Custom error message');
    });

    it('should fall back to default message when error message is empty', () => {
      const error = new PasskeyError('', 'UNKNOWN_CODE');
      const formatted = formatPasskeyError(error);
      expect(formatted).toBe('An error occurred. Please try again.');
    });
  });

  describe('getDeviceTypeLabel', () => {
    it('should return label for singleDevice', () => {
      expect(getDeviceTypeLabel('singleDevice')).toBe('Single Device (e.g., Security Key)');
    });

    it('should return label for multiDevice', () => {
      expect(getDeviceTypeLabel('multiDevice')).toBe('Synced Device (e.g., Phone, Computer)');
    });

    it('should return label for platform', () => {
      expect(getDeviceTypeLabel('platform')).toBe('This Device');
    });

    it('should return label for crossPlatform', () => {
      expect(getDeviceTypeLabel('crossPlatform')).toBe('External Device');
    });

    it('should return "Unknown Device" for unknown types', () => {
      expect(getDeviceTypeLabel('unknownType')).toBe('Unknown Device');
    });
  });

  describe('formatTransports', () => {
    it('should format single transport', () => {
      expect(formatTransports(['usb'])).toBe('USB');
    });

    it('should format multiple transports', () => {
      expect(formatTransports(['usb', 'nfc'])).toBe('USB and NFC');
    });

    it('should format three transports', () => {
      expect(formatTransports(['usb', 'nfc', 'ble'])).toBe('USB, NFC and Bluetooth');
    });

    it('should map transport labels correctly', () => {
      expect(formatTransports(['usb'])).toBe('USB');
      expect(formatTransports(['nfc'])).toBe('NFC');
      expect(formatTransports(['ble'])).toBe('Bluetooth');
      expect(formatTransports(['internal'])).toBe('Built-in');
      expect(formatTransports(['hybrid'])).toBe('Hybrid');
    });

    it('should handle unknown transports', () => {
      expect(formatTransports(['unknown'])).toBe('unknown');
    });

    it('should return "Unknown" for empty array', () => {
      expect(formatTransports([])).toBe('Unknown');
    });

    it('should return "Unknown" for null/undefined', () => {
      expect(formatTransports(null as any)).toBe('Unknown');
      expect(formatTransports(undefined as any)).toBe('Unknown');
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should format date string', () => {
      const dateStr = '2024-01-15T10:30:00Z';
      const formatted = formatDate(dateStr);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should return "Never" for null', () => {
      expect(formatDate(null)).toBe('Never');
    });

    it('should return "Never" for undefined', () => {
      expect(formatDate(undefined)).toBe('Never');
    });

    it('should return "Invalid date" for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid date');
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, { dateStyle: 'short' } as any);
      expect(typeof formatted).toBe('string');
    });
  });
});

