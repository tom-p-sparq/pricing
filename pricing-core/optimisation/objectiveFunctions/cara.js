import { BaseObjectiveFunction } from './base.js'
import { logSumExp } from '../../utils.js'
import { BaseDemandModel } from '../../demand/base.js'

/**
 * Constant Absolute Risk Aversion (CARA) utility objective.
 *
 * `J = −E_θ[ M_N(−ρm | θ) ]`
 *
 * where `M_N` is the MGF of conversions, `ρ` is the risk aversion coefficient,
 * and `m = price − cost`. `J` is always negative, bounded in `(−1, 0)` for
 * `ρ > 0` and `price > cost`. Higher `ρ` penalises profit variance more heavily.
 *
 * Ordinally equivalent to {@link EntropicRiskMeasure} for the same `ρ` —
 * both yield the same optimal price — but values are not in profit units.
 */
export class CARA extends BaseObjectiveFunction {
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
        /**
         * @type {number}
         */
        this.cost
    }

    /**
     * Negated posterior-weighted mean of the conversion MGF evaluated at `t = −ρm`.
     * @override
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     */
    _J(samples, price) {
        const t = -this.parameters.rho * this.incrementalRevenue(price)
        return -Math.exp(logSumExp(samples.map(({ model, logWeight }) =>
            logWeight + model.logMgfConversions(t, price))))
    }
} 