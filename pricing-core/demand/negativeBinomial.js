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
