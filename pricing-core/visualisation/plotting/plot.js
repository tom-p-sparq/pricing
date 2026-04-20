import { plot as observablePlot } from "@observablehq/plot"

/**
 * 
 * @param {HTMLElement} element Where we plot into 
 * @param {...Object} options 
 * @returns 
 */
export function plot(element, ...options) {
    const flatOptions = Object.assign({}, ...options)
    element.replaceChildren(
        observablePlot(flatOptions)
    )
}
