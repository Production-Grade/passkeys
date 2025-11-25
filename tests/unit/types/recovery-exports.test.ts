import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_RECOVERY_CODE_COUNT,
  DEFAULT_RECOVERY_CODE_LENGTH,
  DEFAULT_EMAIL_RECOVERY_TTL_MINUTES,
} from '../../../src/core/types/recovery';

describe('Recovery Type Exports', () => {
  it('should export default recovery code count', () => {
    expect(DEFAULT_RECOVERY_CODE_COUNT).toBe(10);
  });

  it('should export default recovery code length', () => {
    expect(DEFAULT_RECOVERY_CODE_LENGTH).toBe(8);
  });

  it('should export default email recovery TTL', () => {
    expect(DEFAULT_EMAIL_RECOVERY_TTL_MINUTES).toBe(60);
  });
});

