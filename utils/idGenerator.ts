/**
 * Robust Centralized Identifier Generator.
 *
 * Combines timestamps, monotonic micro-counters, and cryptographically
 * random entropy to guarantee collision-free IDs across high-frequency calls.
 */

let counter = 0;

export function generateId(prefix: string = 'id'): string {
    const timestamp = Date.now().toString(36);
    const count = (counter++).toString(36);
    let rand = '';
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        rand = buf[0].toString(36);
    } else {
        rand = Math.random().toString(36).substring(2, 8);
    }
    return `${prefix}_${timestamp}_${count}_${rand}`;
}
