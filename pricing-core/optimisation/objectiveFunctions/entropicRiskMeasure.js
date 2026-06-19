import { BaseObjectiveFunction } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'
import { logSumExp } from '../../utils.js'

/**
 * Entropic risk measure (ERM) objective.
 *
 * `J = −(1/ρ) · log E_θ[ M_N(−ρm | θ) ]`
 *
 * where `ρ` is the risk aversion coefficient and `m = price − cost`.
 * `J` is the certainty-equivalent profit under exponential risk aversion:
 * the sure profit that is indifferent to the risky prospect under CARA utility
 * with coefficient `ρ`. Positive for `price > cost`.
 *
 * Limits:
 * - `ρ → 0`: `J → E[Π]` — recovers {@link ExpectedRevenue}
 * - `ρ → ∞`: `J → ess inf(Π)` — worst-case (minimax) profit
 *
 * Ordinally equivalent to {@link CARA} for the same `ρ` — both yield the same
 * optimal price — but ERM equals the certainty-equivalent profit (the sure
 * profit indifferent to the risky outcome), so values are on the same monetary
 * scale as profit and ρ-sensitivity analysis is directly interpretable.
 */
export class EntropicRiskMeasure extends BaseObjectiveFunction {
    /**
     * @param {Object} args
     * @param {{rho: number}} args.parameters Risk aversion coefficient ρ > 0
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
     * Negated, scaled log of the posterior-weighted mean MGF at `t = −ρm`.
     * Entirely in log space — no exponentiation.
     * @override
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     */
    _J(samples, price) {
        const { rho } = this.parameters
        const t = -rho * this.incrementalRevenue(price)
        return -logSumExp(samples.map(({ model, logWeight }) =>
            logWeight + model.logMgfConversions(t, price))) / rho
    }
}
