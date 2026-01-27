import { BaseDemandModel } from "../conversion/base.js"
import { gradLogLikelihood } from "./likelihoods"

export class Adam {
    /**
     * 
     * @param {object} [params={}]
     * @param {number} [params.learningRate=0.005] Learning rate
     * @param {number} [params.beta1=0.9] Adam's beta1
     * @param {number} [params.beta2=0.999] Adam's beta2
     * @param {number} [params.epsilon=1e-8] Prevent division by zero
     * @param {number} [params.eta=1e-4] L2 regularisation constant
     * @param {number} [params.convergenceThreshold=1e-6] Linf step size for convergence
     */
    constructor({
        learningRate = 0.001,
        beta1 = 0.9,
        beta2 = 0.999,
        epsilon = 1e-8,
        eta = 1e-5,
        convergenceThreshold = 1e-6
    } = {}) {
        this.parameters = { learningRate, beta1, beta2, epsilon, eta, convergenceThreshold };
    }

    /**
     * Initializes or resets the Adam optimizer's moment vectors and time step.
     * @param {BaseDemandModel} model The current demand model.
     */
    reset(model) {
        this.m = Object.fromEntries(model.paramNames.map(name => [name, 0]))
        this.v = Object.fromEntries(model.paramNames.map(name => [name, 0]))
        this.t = 0
    }

    /**
     * Step the model parameters based on data array
     * @param {BaseDemandModel} currentModel The current model parameters ([name, value][]) 
     * @param {{price: number, looks: number, books:number}[]} points  Data being fit as an array of price, looks, books triples.
     * @returns {{nextModel: BaseDemandModel, maxAbsStep: number}} The new model and the step applied to each of the parameters.
     */
    step(currentModel, points) {
        if (points.length === 0) {
            return {nextModel: currentModel, maxAbsStep: 0}
        }
        const {learningRate, beta1, beta2, epsilon, eta} = this.parameters
        const grad = gradLogLikelihood(currentModel, points, eta)
        if (grad === undefined) {
            console.log("Gradient is undefined. Returning current model.")
            return {nextModel: currentModel, maxAbsStep: 0}
        }
        this.t += 1
        let maxAbsStep = 0
        const newParamEntries = currentModel.paramEntries.map(([name, value]) => {
            const g_t = grad[name]
            if (!isFinite(g_t)) {
                console.log(`Gradient is not finite. Returning current value for ${name}`)
                return [name, value]
            }
            // Update (biased) first and second moments
            this.m[name] = beta1 * this.m[name] + (1 - beta1) * g_t
            this.v[name] = beta2 * this.v[name] + (1 - beta2) * (g_t * g_t)
            // Get bias-corrected first and second moments
            const m_hat = this.m[name] / (1 - beta1 ** this.t)
            const v_hat = this.v[name] / (1 - beta2 ** this.t)
            // Update parameters according to Adam
            const step = learningRate * m_hat / (Math.sqrt(v_hat) + epsilon)
            maxAbsStep = Math.max(maxAbsStep, Math.abs(step))
            return [name, value + step]
        })
        const newParams = Object.fromEntries(newParamEntries)
        const modelClass = Object.getPrototypeOf(currentModel).constructor
        return {nextModel: new modelClass(newParams), maxAbsStep}
    }

    /**
     * Iterate through Adam and return the last model
     * @param {BaseDemandModel} currentModel The starting point of the batch run
     * @param {{price: number, looks: number, books:number}[]} points The data to fit
     * @param {number} batchSize The maximum number of iterations to generate
     * @returns {BaseDemandModel}
     */
    batchRun(currentModel, points, batchSize) {
        for (let i = 0; i < batchSize; i++) {
            const {nextModel, maxAbsStep} = this.step(currentModel, points)
            currentModel = nextModel
            if (maxAbsStep < this.parameters.convergenceThreshold) {
                return currentModel
            }
        }
        return currentModel
    }
}
