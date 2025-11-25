// Setup file for React tests
// Mock window and global objects for React
global.window = global.window || {};
global.document = global.document || {};

// Mock PublicKeyCredential for WebAuthn
global.PublicKeyCredential = class MockPublicKeyCredential {
  static isUserVerifyingPlatformAuthenticatorAvailable() {
    return Promise.resolve(false);
  }
};

// Setup @testing-library/jest-dom if available
try {
  require('@testing-library/jest-dom');
} catch (e) {
  // Ignore if not available
}

