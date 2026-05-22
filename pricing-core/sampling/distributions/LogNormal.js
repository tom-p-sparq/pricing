import { BaseDistribution } from './base.js'
import { lognormal as lognormalRandom } from '@stdlib/random-base'
import { lognormal as lognormalDists } from '@stdlib/stats-base-dists'

export class LogNormal extends BaseDistribution {
  /**
   * Creates an instance of LogNormal distribution.
   * @param {{mu: number, sigma: number}} params
   */
  constructor({ mu, sigma }, rng = Math.random) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this._mu = mu;
    this._sigma = sigma
    this._sampler = lognormalRandom.factory(mu, sigma, {prng: rng})
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
    return lognormalDists.logpdf(x, this._mu, this._sigma)
  }
}