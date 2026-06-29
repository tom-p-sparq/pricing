import { BaseDistribution } from './base.js';
import { factory } from '@stdlib/random-base-normal'
import logpdf from '@stdlib/stats-base-dists-normal-logpdf'
import quantile from '@stdlib/stats-base-dists-normal-quantile'

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
    this._sampler = factory(mu, sigma, {prng: rng})
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

  /** @override @param {number} p */
  quantile(p) { return quantile(p, this._mu, this._sigma) }
}