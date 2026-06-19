import { BaseObjectiveFunction, logSumExp } from './base.js'
import { BaseDemandModel } from '../../demand/base.js'

export class ExpectedRevenue extends BaseObjectiveFunction {
    /**
     * @override
     * @protected
     * @param {{model: BaseDemandModel, logWeight: number}[]} samples
     * @param {number} price
     * @returns {number}
     */
    _J(samples, price) {
        const margin = this.incrementalRevenue(price)
        const logNorm = logSumExp(samples.map(s => s.logWeight))
        return margin * samples.reduce((sum, { model, logWeight }) =>
            sum + Math.exp(logWeight - logNorm) * model.expectedConversions(price), 0)
    }
} 