import { BaseDemandModel } from './base.js'
import { BaseConversionModel } from '../conversion/base.js'

export class FixedDemandModel extends BaseDemandModel {
    /**
     * 
     * @param {Object} args 
     * @param {{n: number}} args.parameters Fixed number of looks
     * @param {BaseConversionModel} args.conversionModel Conversion model
     */
    constructor(args) {
        super(args)
        /**
         * @type {{n: number}}
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
        return conversionRate * this.parameters.n
    }

    /**
     * @override
     * @param {number} t 
     * @param {number} conversionRate 
     * @returns {number}
     */
    _logMgfConversions(t, conversionRate) {
        const m = conversionRate * Math.expm1(t)
        return this.parameters.n * Math.log1p(m)
    }
}
