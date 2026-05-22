import { BaseDistribution } from './base.js'
import lognormal from '@stdlib/random-base-lognormal'
import logpdf from '@stdlib/stats-base-dists-lognormal-logpdf'

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
    this._sampler = lognormal.factory(mu, sigma, {prng: rng})
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
    return logpdf(x, this._mu, this._sigma)
  }
}