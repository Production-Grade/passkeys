import { debugLog, debugError } from '../../../src/core/utils/debug';

describe('Debug Utilities', () => {
  const originalEnv = process.env.DEBUG;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env.DEBUG = originalEnv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('debugLog', () => {
    it('should not log when DEBUG is not set', () => {
      delete process.env.DEBUG;
      debugLog('PasskeyService', 'Test message');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should log when DEBUG includes @productiongrade/passkeys', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      debugLog('PasskeyService', 'Test message');
      expect(console.log).toHaveBeenCalled();
      const call = (console.log as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[PasskeyService]');
      expect(call[0]).toContain('Test message');
    });

    it('should log when DEBUG is *', () => {
      process.env.DEBUG = '*';
      debugLog('PasskeyService', 'Test message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should include data when provided', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      const data = { userId: '123', email: 'test@example.com' };
      debugLog('PasskeyService', 'Test message', data);
      expect(console.log).toHaveBeenCalled();
      const call = (console.log as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[PasskeyService]');
      expect(call[0]).toContain('Test message');
      expect(call[1]).toEqual(data);
    });

    it('should include timestamp in log', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      debugLog('PasskeyService', 'Test message');
      const call = (console.log as jest.Mock).mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('debugError', () => {
    it('should not log when DEBUG is not set', () => {
      delete process.env.DEBUG;
      debugError('PasskeyService', 'Test error', new Error('Error message'));
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should log Error objects with details', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      debugError('PasskeyService', 'Test error', error);
      expect(console.error).toHaveBeenCalled();
      const call = (console.error as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[PasskeyService]');
      expect(call[1]).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: 'Error stack trace',
      });
    });

    it('should log non-Error objects as-is', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      const error = { code: 'ERROR_CODE', message: 'Error message' };
      debugError('PasskeyService', 'Test error', error);
      expect(console.error).toHaveBeenCalled();
      const call = (console.error as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('[PasskeyService]');
      expect(call[1]).toBe(error);
    });

    it('should include timestamp in error log', () => {
      process.env.DEBUG = '@productiongrade/passkeys:*';
      debugError('PasskeyService', 'Test error', new Error('Error message'));
      const call = (console.error as jest.Mock).mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

