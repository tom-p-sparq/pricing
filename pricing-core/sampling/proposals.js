import { BaseStep } from './steps/index.js'

/**
 * A proposal distribution over a named set of parameters.
 */
export class Proposal {
  /**
   * @param {{[paramName: string]: BaseStep}} proposalSpec
   *   An object mapping each parameter name to a step distribution.
   */
  constructor(proposalSpec) {
    this.proposalSpec = proposalSpec
  }

  /**
   * Proposes a new parameter object by stepping each parameter of the current one.
   * @param {{[paramName: string]: number}} params The current parameters to step from.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @returns {{[paramName: string]: number}}
   */
  propose(params, rng = Math.random) {
    return Object.fromEntries(
      Object.entries(this.proposalSpec).map(([name, step]) => [name, step.sample(params[name], rng)])
    )
  }

  /**
   * Computes the log density of proposing `proposedParams` given `currentParams`.
   * Required in the MH acceptance ratio when the proposal is asymmetric.
   * @param {{[paramName: string]: number}} proposedParams
   * @param {{[paramName: string]: number}} currentParams
   * @returns {number}
   */
  logPdf(proposedParams, currentParams) {
    return Object.entries(this.proposalSpec).reduce(
      (sum, [name, step]) => sum + step.logPdf(proposedParams[name], currentParams[name]), 0
    )
  }
}
