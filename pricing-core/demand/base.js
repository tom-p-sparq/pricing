import { BaseConversionModel } from '../conversion/base.js'

/**
 * @abstract
 * Base class for demand models, comprising a looks process and conversion model.
 */
export class BaseDemandModel {
    /**
     * 
     * @param {Object} args 
     * @param {{[paramName: string]: number}} args.parameters Looks model parameter(s)
     * @param {BaseConversionModel} args.conversionModel Conversion model
     */
    constructor({parameters, conversionModel}) {
        /**
         * @type {{[paramName: string]: number}}
         */
        this.parameters = parameters;
        /**
         * @type {BaseConversionModel}
         */
        this.conversionModel = conversionModel;
    }

    /**
     * Conversion rate
     * @param {number} price The price at which we measure conversion
     * @returns {number}
     */
    conversion(price) {
        return this.conversionModel.conversion(price)
    }
    
    /**
     * Expected converted looks at given price 
     * @param {number} price 
     * @returns {number}
     */
    expectedConversions(price) {
        const phi = this.conversion(price)
        return this._expectedConversions(phi)
    }

    /**
     * MGF of converted looks at given price
     * @param {number} t 
     * @param {number} price
     * @returns {number}
     */
    mgfConversions(t, price) {
        const phi = this.conversion(price)
        return this._mgfConversions(t, phi)
    }

    /**
     * Log MGF of converted looks at given price
     * @param {number} t 
     * @param {number} price
     * @returns {number}
     */
    logMgfConversions(t, price) {
        const phi = this.conversion(price)
        return this._logMgfConversions(t, phi)
    }

    /**
     * Expectation - private implementation
     * @abstract
     * @protected
     * @param {number} _conversionRate Looks convert at this rate
     * @returns {number}
     * @throws {Error} Must be implemented by subclasses
     */
    _expectedConversions(_conversionRate) {
        throw new Error("Subclasses of `BaseDemandModel` must implement `_expectedConversions`.")
    }

    /**
     * Moment generating function - private implementation.
     * Default: exp of {@link _logMgfConversions}. Override only if a non-log-space
     * form is preferable; subclasses MUST implement `_logMgfConversions`.
     * @protected
     * @param {number} t Laplace transform variable
     * @param {number} conversionRate Looks convert at this rate
     * @returns {number}
     */
    _mgfConversions(t, conversionRate) {
        return Math.exp(this._logMgfConversions(t, conversionRate))
    }

    /**
     * Log-space moment generating function - private implementation.
     * Required primitive: subclasses MUST implement this.
     * @abstract
     * @protected
     * @param {number} t Laplace transform variable
     * @param {number} _conversionRate Looks convert at this rate
     * @returns {number}
     * @throws {Error} Must be implemented by subclasses
     */
    _logMgfConversions(t, _conversionRate) {
        throw new Error("Subclasses of `BaseDemandModel` must implement `_logMgfConversions`.")
    }
}