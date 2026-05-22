/** @import { BaseStep } from './steps/base.js' */

/**
 * A proposal distribution over a named set of parameters.
 */
export class Proposal {
  /**
   * @param {{ [paramName: string]: [new(params: object, rng?: () => number) => BaseStep, object] }} proposalSpec
   *   An object mapping each parameter name to a [StepClass, params] tuple.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @example
   * new Proposal(
   *   { conversion: [NormalStep, { sigma: 0.1 }], elasticity: [NormalStep, { sigma: 0.1 }] },
   *   rng
   * )
   */
  constructor(proposalSpec, rng = Math.random) {
    this._steps = Object.fromEntries(
      Object.entries(proposalSpec).map(([name, [Step, params]]) => [name, new Step(params, rng)])
    )
  }

  /**
   * Proposes a new parameter object by stepping each parameter of the current one.
   * @param {{[paramName: string]: number}} currentParams The current parameters to step from.
   * @returns {{[paramName: string]: number}}
   */
  propose(currentParams) {
    return Object.fromEntries(
      Object.entries(this._steps).map(([name, step]) => [name, step.sample(currentParams[name])])
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
    return Object.entries(this._steps).reduce(
      (sum, [name, step]) => sum + step.logPdf(proposedParams[name], currentParams[name]), 0
    )
  }
}
