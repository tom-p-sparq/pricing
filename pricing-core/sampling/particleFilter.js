import { logLikelihood } from '../fitting/likelihoods.js'
import { BaseDemandModel } from '../conversion/base.js'
import { Prior } from './priors.js'
import { Proposal } from './proposals.js'
import { mhStep } from './mcmc.js'

/**
 * Bootstrap particle filter with optional MCMC rejuvenation.
 * Processes data points sequentially, yielding the particle set after each observation.
 *
 * @template {BaseDemandModel} T
 * @param {Prior<T>} prior
 * @param {Proposal} proposal Applies MCMC rejuvenation after resampling.
 * @param {Array<{price: number, looks: number, books: number}>} data
 * @param {object} [options]
 * @param {number} [options.N=500] Number of particles.
 * @param {number} [options.resampleThreshold=0.5] Resample when ESS < N * resampleThreshold.
 * @param {number} [options.mcmcSteps=5] Number of MH rejuvenation steps per particle.
 * @yields {{ particles: T[], weights: number[] }}
 */
export function* particleFilter(prior, proposal, data, options = {}) {
  const pf = new ParticleFilterState(prior, proposal, options)
  yield pf.current
  for (const dataPoint of data) {
    yield pf.update([dataPoint])
  }
}

/**
 * Stateful particle filter for incremental posterior updates.
 * Suitable for interactive use where data arrives in batches over time.
 *
 * @template {BaseDemandModel} T
 */
export class ParticleFilterState {
  /**
   * @param {Prior<T>} prior
   * @param {Proposal} [proposal] If provided, applies MCMC rejuvenation after resampling.
   * @param {object} [options]
   * @param {number} [options.N=500] Number of particles.
   * @param {number} [options.resampleThreshold=0.5] Resample when ESS < N * resampleThreshold.
   * @param {number} [options.mcmcSteps=5] Number of MH rejuvenation steps per particle.
   */
  constructor(prior, proposal, { N = 500, resampleThreshold = 0.5, mcmcSteps = 5 } = {}) {
    this._prior = prior
    this._proposal = proposal
    this._N = N
    this._resampleThreshold = resampleThreshold
    this._mcmcSteps = mcmcSteps
    this._particles = Array.from({ length: N }, () => prior.sample())
    this._logWeights = new Array(N).fill(-Math.log(N))
    /** @type {Array<{price: number, looks: number, books: number}>} */
    this._observedData = []
  }

  /**
   * The weights (i.e. not in log space).
   * @returns {number[]}
   */
  get weights() {
    return this._logWeights.map(Math.exp)
  }
  
  /**
   * The current particle set and normalised weights, without consuming new data.
   * @returns {{ particles: T[], weights: number[] }}
   */
  get current() {
    return {
      particles: this._particles.map(p => this._prior.makeModel(p)),
      weights: this.weights,
    }
  }

  /**
   * The effective sample size (ESS).
   * Effective sample size measures particle diversity: ESS = 1/Σwᵢ² ranges
   * from 1 (all weight on one particle) to N (uniform weights). Low ESS means
   * a handful of particles dominate and the approximation is poor.
   * @returns { number }
   */
  get ess() {
    const logEss = 2*logSumExp(this._logWeights) - logSumExp(this._logWeights.map(lw => 2 * lw))
    return Math.exp(logEss)
  }

  /**
   * Updates the particle set with a new batch of observations.
   * Processes each point in the batch sequentially, resampling and rejuvenating as needed.
   * @param {Array<{price: number, looks: number, books: number}>} newData
   * @returns {{ particles: T[], weights: number[] }}
   */
  update(newData) {
    const { _prior: prior, _proposal: proposal, _N: N, _resampleThreshold: resampleThreshold, _mcmcSteps: mcmcSteps } = this
    const rng = prior.rng

    for (const dataPoint of newData) {
      this._observedData.push(dataPoint)

      // Each particle's weight is multiplied by the likelihood of the new observation.
      // Working in log space avoids underflow when likelihoods are very small.
      this._logWeights = this._particles.map((params, i) =>
        this._logWeights[i] + logLikelihood(prior.makeModel(params), [dataPoint])
      )

      // Normalise so weights sum to 1. Log-sum-exp subtracts the log of the
      // normalising constant, keeping everything in log space until needed.
      const lse = logSumExp(this._logWeights)
      this._logWeights = this._logWeights.map(lw => lw - lse)
      
      if (this.ess < N * resampleThreshold) {
        // Resample N particles with replacement proportional to their weights,
        // then reset to uniform weights. Particles in high-probability regions
        // get multiple copies; low-probability ones are discarded.
        this._particles = systematicResample(this._particles, this.weights, N, rng)
        this._logWeights = new Array(N).fill(-Math.log(N))

        // After resampling, many particles are identical copies. MCMC rejuvenation
        // applies MH moves to each particle independently, targeting the full
        // posterior over all data observed so far, to restore diversity.
        if (proposal && mcmcSteps > 0) {
          this._particles = this._particles.map(params => {
            let currentParams = params
            let currentLogPost = logLikelihood(prior.makeModel(currentParams), this._observedData) + prior.logPdf(currentParams)
            for (let k = 0; k < mcmcSteps; k++) {
              ({ params: currentParams, logPost: currentLogPost } = mhStep(currentParams, currentLogPost, prior, proposal, this._observedData))
            }
            return currentParams
          })
        }
      }
    }
    return this.current
  }
}

/**
 * @param {number[]} logValues
 * @returns {number}
 */
function logSumExp(logValues) {
  const max = Math.max(...logValues)
  return max + Math.log(logValues.reduce((sum, lv) => sum + Math.exp(lv - max), 0))
}

/**
 * Systematic resampling — O(N), unbiased, lower variance than multinomial resampling.
 * @param {any[]} particles
 * @param {number[]} weights Normalised weights summing to 1.
 * @param {number} N
 * @param {() => number} rng
 * @returns {any[]}
 */
function systematicResample(particles, weights, N, rng) {
  const cumWeights = []
  let cumSum = 0
  for (const w of weights) {
    cumSum += w
    cumWeights.push(cumSum)
  }

  const resampled = []
  const step = 1 / N
  let u = rng() * step
  let j = 0
  for (let i = 0; i < N; i++) {
    while (cumWeights[j] < u) j++
    resampled.push(particles[j])
    u += step
  }
  return resampled
}
