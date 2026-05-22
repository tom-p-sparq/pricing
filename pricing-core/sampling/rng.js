import mt19937 from '@stdlib/random-base-mt19937'

/**
 * @param {number} [seed]
 * @returns {() => number}
 */
export function createRng(seed) {
  return mt19937.factory(seed !== undefined ? { seed } : {}).normalized
}
