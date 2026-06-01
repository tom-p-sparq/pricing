import { plot as observablePlot } from "@observablehq/plot"

/**
 * 
 * @param {HTMLElement} element Where we plot into 
 * @param {...Object} options 
 * @returns 
 */
export function plot(element, ...options) {
    const marks = options.flatMap(o => o.marks ?? [])
    const width = element.clientWidth || undefined
    const flatOptions = Object.assign({ width }, ...options, { marks })
    element.replaceChildren(
        observablePlot(flatOptions)
    )
}
