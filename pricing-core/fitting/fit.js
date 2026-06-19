import { BaseConversionModel } from "../conversion/base.js";
import { Adam } from "./adam.js"
import { logLikelihood } from "./likelihoods.js"

/**
 * Create an iterator that fits a model to data
 * 
 * @param {BaseConversionModel} model The model to fit
 * @param {Adam} optimiser The optimiser to use for fitting
 * @param {{price: number, looks: number, books: number}[]} data The data to fit the model to
 * @param {Object} options
 * @param {number} [options.epsilon=1e-5] The convergence threshold
 * @param {number} [options.batchSize=100] The number of steps per iteration
 * @returns {Generator<BaseConversionModel, void, void>} A generator that yields the model at each step of the fitting process.
 */
export function* fit(model, optimiser, data, { epsilon = 1e-5, batchSize = 100 }) {
    const numPoints = data.length;
    const modelClass = Object.getPrototypeOf(model).constructor
    if (numPoints == 0) {
        yield model
    }
    if (numPoints == 1) {
        const { price, looks, books } = data[0]
        const referencePoint = {
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
            elasticity: -2,
        }
        yield modelClass.fromReference(referencePoint)
    } else if (numPoints == 2) {
        const points = data.map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        yield modelClass.interpolate(points[0], points[1]);
    } else {
        optimiser.reset(model)
        const LLH = logLikelihood(model, data);
        if (LLH/numPoints < -5) {
            model = makeFlatModel(modelClass, data);
        }
        let oldLLH;
        let newLLH = LLH;
        do {
            oldLLH = newLLH;
            model = optimiser.batchRun(model, data, batchSize);
            newLLH = logLikelihood(model, data);
            yield model
        } while (newLLH - oldLLH > epsilon)
        console.log(`${modelClass.name} converged with normalised LLH: ${newLLH / numPoints}`);
        yield model
    }
}

/**
 * @param {typeof BaseConversionModel} modelClass
 * @param {{price: number, looks: number, books: number}[]} data
 * @returns {BaseConversionModel}
 */
function makeFlatModel(modelClass, data) {
    const totalLooks = data.reduce((total, point) => total + point.looks, 0);
    const totalBooks = data.reduce((total, point) => total + point.books, 0);
    const averageConversion = Math.max(0.0001, Math.min(0.9999, totalBooks / totalLooks));
    return modelClass.fromFlat(averageConversion);
}