import { BaseObjectiveFunction } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'
import { logSumExp } from '../../utils.js'

/**
 * Mean-variance objective: `E[P] − ρ·Var[P]`, for profit `P = m·K` where
 * `m = price − cost` and `K` is converted looks.
 *
 * Under posterior uncertainty, `Var[P]` is computed via the mixture law of
 * total variance across weighted samples — `Var[P] = E_θ[Var[P|θ]] + Var_θ[E[P|θ]]`
 * — rather than a posterior-weighted average of each sample's own
 * mean-variance objective. This is required for `J` to represent the variance
 * of the *actual* mixture distribution of profit, consistent with how CARA/ERM
 * average MGFs across the posterior rather than averaging the objective itself.
 */
export class MeanVariance extends BaseObjectiveFunction {
    /**
     * @param {Object} args
     * @param {{rho: number}} args.parameters Risk aversion coefficient ρ ≥ 0
     * @param {number} args.cost Underlying cost defining incremental revenue
     */
    constructor(args) {
        super(args)
        /**
         * @type {{rho: number}}
         */
        this.parameters
    }

    /**
     * `E[P] − ρ·Var[P]` under the mixture law of total variance.
     * @override
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     */
    _J(samples, price) {
        const margin = this.incrementalRevenue(price)
        const logNorm = logSumExp(samples.map(s => s.logWeight))
        const weighted = samples.map(({ model, logWeight }) => ({
            w: Math.exp(logWeight - logNorm),
            mu: margin * model.expectedConversions(price),
            varP: margin * margin * model.varianceConversions(price),
        }))
        const meanP = weighted.reduce((sum, { w, mu }) => sum + w * mu, 0)
        const varP = weighted.reduce((sum, { w, mu, varP }) => sum + w * (varP + mu * mu), 0) - meanP * meanP
        return meanP - this.parameters.rho * varP
    }
}
