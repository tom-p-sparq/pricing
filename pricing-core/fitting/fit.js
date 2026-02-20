import { BaseDemandModel } from "../conversion/base";
import { Adam } from "./adam"
import { logLikelihood } from "./likelihoods"

/**
 * Create an iterator that fits a model to data
 * 
 * @param {BaseDemandModel} model The model to fit
 * @param {Adam} optimiser The optimiser to use for fitting
 * @param {{price: number, looks: number, books: number}[]} data The data to fit the model to
 * @param {Object} options
 * @param {number} [options.epsilon=1e-5] The convergence threshold
 * @param {number} [options.batchSize=100] The number of steps per iteration
 * @returns {Generator<BaseDemandModel, BaseDemandModel, void>} A generator that yields the model at each step of the fitting process.
 */
export function* fit(model, optimiser, data, {epsilon=1e-5, batchSize=100}) {
    const numPoints = data.length;
    const modelClass = Object.getPrototypeOf(model).constructor
    if (numPoints == 0) {
        return model
    }
    if (numPoints == 1) {
        const { price, looks, books } = data[0]
        const referencePoint = {
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
            elasticity: -2,
        }
        yield modelClass.from_reference(referencePoint)
    } else if (numPoints == 2) {
        const points = data.map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        yield modelClass.interpolate(points[0], points[1]);
    } else {
        optimiser.reset(model)
        let oldLLH;
        let newLLH = logLikelihood(model, data);
        do {
            oldLLH = newLLH;
            model = optimiser.batchRun(model, data, batchSize);
            newLLH = logLikelihood(model, data);
            yield model
        } while (newLLH - oldLLH > epsilon)
        console.log(`${modelClass.name} converged with normalised LLH: ${newLLH/numPoints}`);
        yield model
    }
}