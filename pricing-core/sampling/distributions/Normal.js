import { BaseDistribution } from './base.js';
import { normal as normalRandom } from '@stdlib/random-base'
import { normal as normalDists } from '@stdlib/stats-base-dists'

export class Normal extends BaseDistribution {
  /**
   * Creates an instance of Normal distribution.
   * @param {{mu: number, sigma: number}} params
   */
  constructor({ mu, sigma }, rng = Math.random) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this._mu = mu;
    this._sigma = sigma;
    this._sampler = normalRandom.factory(mu, sigma, {prng: rng})
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
    return normalDists.logpdf(x, this._mu, this._sigma)
  }
}