import { plot as observablePlot } from "@observablehq/plot"

/**
 * 
 * @param {HTMLElement} element Where we plot into 
 * @param {...Object} options 
 * @returns 
 */
export function plot(element, ...options) {
    const marks = options.flatMap(o => o.marks ?? [])
    const flatOptions = Object.assign({}, ...options, { marks })
    element.replaceChildren(
        observablePlot(flatOptions)
    )
}
