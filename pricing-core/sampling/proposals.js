import { BaseDemandModel } from '../conversion/base.js'
import { BaseStep } from './steps/base.js'

/**
 * Constructs a new proposed model by applying a step to each parameter of the current model.
 * @param {BaseDemandModel} model The current model to step from.
 * @param {{[paramName: string]: BaseStep}} proposalSpec
 *   An object mapping each parameter name to a step distribution.
 * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
 * @returns {BaseDemandModel} A new model instance with proposed parameters.
 */
export function proposeModel(model, proposalSpec, rng = Math.random) {
  const ModelClass = Object.getPrototypeOf(model).constructor
  const params = Object.fromEntries(
    model.paramEntries.map(([name, value]) => [name, proposalSpec[name].sample(value, rng)])
  )
  return new ModelClass(params)
}

/**
 * Computes the log density of proposing `proposedModel` given `currentModel` under a proposal specification.
 * Required in the MH acceptance ratio when the proposal is asymmetric (e.g. LogNormalStep or biased NormalStep).
 * @param {BaseDemandModel} proposedModel The proposed model.
 * @param {BaseDemandModel} currentModel The current model being stepped from.
 * @param {{[paramName: string]: BaseStep}} proposalSpec
 *   An object mapping each parameter name to a step distribution.
 * @returns {number} The sum of log proposal densities across all parameters.
 */
export function logProposalDensity(proposedModel, currentModel, proposalSpec) {
  return proposedModel.paramEntries.reduce(
    (sum, [name, proposedValue]) =>
      sum + proposalSpec[name].logPdf(proposedValue, currentModel.parameters[name]),
    0
  )
}
