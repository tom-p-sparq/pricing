import { BaseObjectiveFunction } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'

/**
 * Risk-neutral objective: expected profit `m · E[N]`, where `m = price − cost`
 * and `E[N]` is expected conversions.
 *
 * Under posterior uncertainty, `J` is the posterior-weighted mean of expected
 * profit across sampled demand models. Positive for `price > cost`.
 */
export class ExpectedRevenue extends BaseObjectiveFunction {
    /**
     * Posterior-weighted mean of `m · expectedConversions(price)`.
     * @override
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     */
    _J(samples, price) {
        const margin = this.incrementalRevenue(price)
        return margin * samples.reduce((sum, { model, logWeight }) =>
            sum + Math.exp(logWeight) * model.expectedConversions(price), 0)
    }
} 