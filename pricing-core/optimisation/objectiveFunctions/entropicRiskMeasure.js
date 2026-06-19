import { BaseObjectiveFunction } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'
import { logSumExp } from '../../utils.js'

export class EntropicRiskMeasure extends BaseObjectiveFunction {
    /**
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
    }

    /**
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
