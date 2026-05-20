import { BaseDemandModel } from '../conversion/base.js'
import { BaseStep } from './steps/index.js'

/**
 * Bundles a set of step distributions for proposing moves in parameter space.
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
   * Proposes a new model by applying a step to each parameter of the current model.
   * @param {BaseDemandModel} model The current model to step from.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @returns {BaseDemandModel} A new model instance with proposed parameters.
   */
  propose(model, rng = Math.random) {
    const ModelClass = Object.getPrototypeOf(model).constructor
    const params = Object.fromEntries(
      model.paramEntries.map(([name, value]) => [name, this.proposalSpec[name].sample(value, rng)])
    )
    return new ModelClass(params)
  }

  /**
   * Computes the log density of proposing `proposedModel` given `currentModel`.
   * Required in the MH acceptance ratio when the proposal is asymmetric.
   * @param {BaseDemandModel} proposedModel
   * @param {BaseDemandModel} currentModel
   * @returns {number}
   */
  logPdf(proposedModel, currentModel) {
    return proposedModel.paramEntries.reduce(
      (sum, [name, proposedValue]) =>
        sum + this.proposalSpec[name].logPdf(proposedValue, currentModel.parameters[name]),
      0
    )
  }
}
