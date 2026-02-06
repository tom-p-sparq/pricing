/**
 * Checks if the log-likelihood for a given model and data points is finite.
 * The log-likelihood becomes non-finite (-Infinity) if we need to compute log(0). This happens when:
 * - The conversion rate is 0, but there are observed bookings (books > 0).
 * - The conversion rate is 1, but there are observed instances of no bookings (looks > books).
 * @param {import('../conversion/base.js').BaseDemandModel} model The demand model to evaluate.
 * @param {Array<{price: number, looks: number, books: number}>} points An array of data points.
 * @returns {boolean} `true` if the log-likelihood is finite for all points, `false` otherwise.
 */
function hasFiniteLogLikelihood(model, points) {
    return points.every(({ price, looks, books }) => {
        const p = model.conversion(price);
        return (books === 0 || p > 0) && (looks === books || p < 1);
    });
}

/**
 * Calculates the total log-likelihood for a given model and a set of data points.
 *
 * @param {import('../conversion/base.js').BaseDemandModel} model The demand model to evaluate.
 * @param {Array<{price: number, looks: number, books: number}>} points An array of data points, each with `price`, `looks`, and `books`.
 * @returns {number} The total log-likelihood of the data given the model.
 */
export function logLikelihood(model, points) {
    if (!hasFiniteLogLikelihood(model, points)) {
        return Number.NEGATIVE_INFINITY;
    } else {
        return points.reduce((totalLogLikelihood, point) => {
            const { price, looks, books } = point;
            const conversion = model.conversion(price);
            // Avoid taking log of 0
            const p = Math.max(1e-9, Math.min(1 - 1e-9, conversion));
            const pointLogLikelihood = books * Math.log(p) + (looks - books) * Math.log(1 - p);
            return totalLogLikelihood + pointLogLikelihood;
        }, 0);
    }
}

/**
 * Calculates the gradient of the log-likelihood for a given model and a set of data points.
 *
 * @param {import('../conversion/base.js').BaseDemandModel} model The demand model to evaluate.
 * @param {Array<{price: number, looks: number, books: number}>} points An array of data points, each with `price`, `looks`, and `books`.
 * @returns {Record<string, number> | undefined} An object where keys are model parameter names and values are the corresponding gradients.
 *               Returns undefined if the log-likelihood is not finite.
 */
export function gradLogLikelihood(model, points, eta=0) {
    // if (!hasFiniteLogLikelihood(model, points)) {
    //     return undefined;
    // }
    const paramNames = model.paramNames;
    const totalGrad = Object.fromEntries(paramNames.map(param => [param, 0]));

    for (const { price, looks, books } of points) {
        const { conversion, rejection } = model.gradLog(price);

        for (const param of model.paramNames) {
            if (conversion[param] === undefined || rejection[param] === undefined) {
                throw new Error(`Gradient for parameter '${param}' not found at price ${price}. The model's gradLog implementation may be incomplete.`);
            }
            if (books > 0) {
                totalGrad[param] += books * conversion[param];
            }
            if (looks > books) {
                totalGrad[param] += (looks - books) * rejection[param];
            }
        }
    }
    for (const [param, value] of model.paramEntries) {
        totalGrad[param] -= eta * value;
    }
    return totalGrad;
}
