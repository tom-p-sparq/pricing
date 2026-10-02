import { BaseDemandModel } from './base.js'
import { BaseConversionModel } from '../conversion/base.js'

export class NegativeBinomialDemandModel extends BaseDemandModel {
    /**
     * @param {Object} args
     * @param {{lambda: number, r: number}} args.parameters Mean looks (lambda) and dispersion (r); r → ∞ recovers Poisson
     * @param {BaseConversionModel} args.conversionModel Conversion model
     */
    constructor(args) {
        super(args)
        /**
         * @type {{lambda: number, r: number}}
         */
        this.parameters
    }

    /**
     * @override
     * @protected
     * @param {number} conversionRate
     * @returns {number}
     */
    _expectedConversions(conversionRate) {
        return conversionRate * this.parameters.lambda
    }

    /**
     * Thinned negative binomial: converted looks are NB with mean μ = λφ and the same
     * dispersion r, so the variance is μ + μ²/r.
     * @override
     * @protected
     * @param {number} conversionRate
     * @returns {number}
     */
    _varianceConversions(conversionRate) {
        const mu = conversionRate * this.parameters.lambda
        return mu + mu * mu / this.parameters.r
    }

    /**
     * @override
     * @protected
     * @param {number} t
     * @param {number} conversionRate
     * @returns {number}
     */
    _logMgfConversions(t, conversionRate) {
        const { lambda, r } = this.parameters
        return -r * Math.log1p(-(conversionRate * lambda / r) * Math.expm1(t))
    }
}
