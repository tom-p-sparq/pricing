import { BaseDemandModel } from './base.js'
import { BaseConversionModel } from '../conversion/base.js'

export class PoissonDemandModel extends BaseDemandModel {
    /**
     * 
     * @param {Object} args 
     * @param {{lambda: number}} args.parameters Poisson rate for looks model
     * @param {BaseConversionModel} args.conversionModel Conversion model
     */
    constructor(args) {
        super(args)
        /**
         * @type {{lambda: number}}
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
     * Thinned Poisson: converted looks are Poisson(λφ), so the variance equals the mean.
     * @override
     * @protected
     * @param {number} conversionRate
     * @returns {number}
     */
    _varianceConversions(conversionRate) {
        return conversionRate * this.parameters.lambda
    }

    /**
     * @override
     * @param {number} t 
     * @param {number} conversionRate 
     * @returns {number}
     */
    _logMgfConversions(t, conversionRate) {
        return conversionRate * this.parameters.lambda * (Math.exp(t) - 1)
    }
}
