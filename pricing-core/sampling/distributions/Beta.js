import { BaseDistribution } from './base.js';
import { beta as betaRandom } from '@stdlib/random-base'
import { beta as betaDists } from '@stdlib/stats-base-dists'

export class Beta extends BaseDistribution {
  /**
   * Creates an instance of Beta distribution.
   * @param {{mean: number, sampleSize: number}} params
   */
  constructor({ mean, sampleSize }, rng = Math.random) {
    if (mean * (1-mean) <= 0) {
      throw new Error("Mean must be strictly between 0 and 1.");
    }
    if (sampleSize <= 0) {
      throw new Error("Sample size must be positive.");
    }
    super();
    this._alpha = mean * sampleSize;
    this._beta = (1 - mean) * sampleSize;
    this._sampler = betaRandom.factory(this._alpha, this._beta, {prng: rng})
  }

  /** @override */
  sample() {
    return this._sampler()
  }

  /**
   * @override
   * @param {number} x
   */
  logPdf(x) {
    return betaDists.logpdf(x, this._alpha, this._beta)
  }
}