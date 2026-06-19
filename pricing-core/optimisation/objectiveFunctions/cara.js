import { BaseObjectiveFunction, logSumExp } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'

export class CARA extends BaseObjectiveFunction {
    /**
     * 
     * @param {Object} args 
     * @param {{rho: number}} args.parameters Risk aversion parameter
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