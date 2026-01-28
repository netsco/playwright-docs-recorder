import { describe, it, expect } from 'vitest';
import { slugify } from '../index.js';

describe('slugify', () => {
  it('converts spaces to dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('converts to lowercase', () => {
    expect(slugify('UPPERCASE')).toBe('uppercase');
    expect(slugify('MixedCase')).toBe('mixedcase');
  });

  it('removes special characters', () => {
    expect(slugify('Test @#$ Guide!')).toBe('test-guide');
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('removes leading and trailing dashes', () => {
    expect(slugify('  Hello  ')).toBe('hello');
    expect(slugify('--hello--')).toBe('hello');
    expect(slugify('---test---')).toBe('test');
  });

  it('collapses multiple dashes into one', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles strings with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('handles numbers', () => {
    expect(slugify('Test 123')).toBe('test-123');
    expect(slugify('2024 Guide')).toBe('2024-guide');
  });

  it('handles real-world titles', () => {
    expect(slugify('Getting Started Guide')).toBe('getting-started-guide');
    expect(slugify('How to: Setup Docker')).toBe('how-to-setup-docker');
    expect(slugify("User's Manual (v2.0)")).toBe('user-s-manual-v2-0');
  });
});
