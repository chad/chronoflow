// Test setup - runs before all tests
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installMockAudioContext } from './mocks/AudioContext';

// Install mock Web Audio API before any tests
beforeAll(() => {
  installMockAudioContext();
});

// Cleanup after each test when using @testing-library/react
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock window.setInterval and clearInterval for tests
vi.stubGlobal('setInterval', vi.fn(() => {
  return 1; // Return a mock interval ID
}));
vi.stubGlobal('clearInterval', vi.fn());
