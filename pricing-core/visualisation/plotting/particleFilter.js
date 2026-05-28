import { ruleY, ruleX, lineY, crosshair, tip, pointer, dot } from "@observablehq/plot";
import { range } from 'd3';
import { BaseDemandModel } from "/pricing-core/conversion/index.js";

/** 
 * @template {BaseDemandModel} T
*/
/**
 * 
 * @param {object} weightedSample
 * @param {T[]} weightedSample.particles
 * @param {number[]} weightedSample.weights
 */
export function sampleScatterPlot(weightedSample, fX = (/** @type {T} */ x) => x.parameters.a, fY = (/** @type {T} */ x) => x.parameters.b) {
    const { particles, weights } = weightedSample
    const data = _sampleData({ particles, weights, fX, fY })
    const dots = _sampleDots(data)
    return {
        marks: dots,
    }
}

function _sampleData({ particles, weights, fX, fY }) {
    return particles.map((model, i) => ({
        x: fX(model),
        y: fY(model),
        weight: weights[i],
    }))
}

export function _sampleDots(data) {
    const maxWeight = data.reduce((max, d) => Math.max(max, d.weight), 0)
    return [
        dot(data, { x: "x", y: "y", fill: "orange", stroke: "black", strokeWidth: 1, r: 3, opacity: d => d.weight / maxWeight }),
    ]
}

