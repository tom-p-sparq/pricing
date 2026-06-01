import { range, form } from '@observablehq/inputs'
import { html } from 'htl'

/**
 * Creates a form for specifying prior distribution parameters and appends it to a given element.
 *
 * The prior has two components:
 *  - Conversion at reference price: Beta(mean, sampleSize)
 *  - Elasticity at reference price: Normal(mu, sigma)
 *
 * @param {HTMLElement} element The DOM element to append the form to.
 * @returns {HTMLElement & { value: { referencePrice: number, conversionMean: number, conversionSampleSize: number, elasticityMu: number, elasticitySigma: number } }}
 */
export function priorForm(element) {
    if (!(element instanceof HTMLElement)) {
        throw new Error('priorForm: the provided element is not a valid HTMLElement.')
    }

    const referencePrice = range([50, 250], {
        step: 1,
        value: 150,
        label: 'Reference price',
    })
    const conversionMean = range([0.01, 0.99], {
        step: 0.01,
        value: 0.5,
        label: 'Expected conversion',
    })
    const conversionSampleSize = range([2, 100], {
        step: 1,
        value: 10,
        label: 'Confidence',
    })
    const elasticityMu = range([-5, -0.1], {
        step: 0.1,
        value: -2,
        label: 'Expected elasticity',
    })
    const elasticitySigma = range([0.1, 2], {
        step: 0.05,
        value: 0.5,
        label: 'Elasticity uncertainty',
    })

    const priorSliders = form(
        { referencePrice, conversionMean, conversionSampleSize, elasticityMu, elasticitySigma },
        {
            template: ({ referencePrice, conversionMean, conversionSampleSize, elasticityMu, elasticitySigma }) =>
                html`<div style="display: flex; flex-wrap: wrap; gap: 1em;">
                    <div>${referencePrice}</div>
                    <div>${conversionMean}${conversionSampleSize}</div>
                    <div>${elasticityMu}${elasticitySigma}</div>
                </div>`
        }
    )

    element.append(priorSliders)

    return priorSliders
}
