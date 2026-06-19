import { BaseDemandModel } from '../../demand/base.js'
import { logSumExp } from '../../utils.js'

export class BaseObjectiveFunction {
    /**
     * 
     * @param {Object} args 
     * @param {{[paramName: string]: number}} args.parameters Objective function (hyper)parameters
     * @param {number} args.cost Underlying cost defining incremental revenue
     */
    constructor({parameters={}, cost=0}) {
        /**
         * @type {{[paramName: string]: number}}
         */
        this.parameters = parameters
        /**
         * @type {number}
         */
        this.cost = cost
    }

    /**
     *
     * @param {number} price
     * @returns {number}
     */
    incrementalRevenue(price) {
        return price - this.cost
    }

    /**
     * Objective function value. Accepts a single demand model or an array of
     * weighted posterior samples `{model, logWeight}[]`.
     * Normalises the single-model case to a unit-weight sample and delegates to `_J`.
     * @param {BaseDemandModel | {model: BaseDemandModel, logWeight: number}[]} demandModel
     * @param {number} price
     * @returns {number}
     */
    J(demandModel, price) {
        const samples = Array.isArray(demandModel)
            ? demandModel
            : [{ model: demandModel, logWeight: 0 }]
        return this._J(samples, price)
    }

    /**
     * Objective function implementation over weighted posterior samples.
     * Subclasses choose their own aggregation strategy (log-sum-exp, weighted mean, etc.).
     * @abstract
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     * @throws {Error} Must be implemented by subclasses
     */
    _J(samples, price) {
        throw new Error("Subclasses of `BaseObjectiveFunction` must implement `_J`.")
    }
}