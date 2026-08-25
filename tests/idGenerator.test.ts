import { describe, it, expect } from 'vitest';
import { generateId } from '../utils/idGenerator';

describe('ID Generator', () => {
  it('generates unique IDs across 5,000 rapid successive calls', () => {
    const set = new Set<string>();
    const count = 5000;
    for (let i = 0; i < count; i++) {
      set.add(generateId('test'));
    }
    expect(set.size).toBe(count);
  });

  it('includes the provided prefix in the generated string', () => {
    const id = generateId('fx_flow');
    expect(id.startsWith('fx_flow_')).toBe(true);
  });

  it('defaults to id prefix when no prefix is specified', () => {
    const id = generateId();
    expect(id.startsWith('id_')).toBe(true);
  });
});
