import { ruleY, ruleX, lineY, crosshair, tip, pointer, dot } from "@observablehq/plot";
import { range } from 'd3';
import { BaseDemandModel } from "/pricing-core/conversion/index.js";

/**
 * Projects a demand model onto a 2-D point for scatter plotting.
 * @template {BaseDemandModel} T
 * @callback SampleProjection
 * @param {T} demandModel
 * @returns {{ x: number, y: number }}
 */

/**
 * @template {BaseDemandModel} T
 * @param {{ particles: T[], weights: number[] }} weightedSample
 * @param {SampleProjection<T>} [fun] - Defaults to plotting parameters `a` vs `b`.
 */
export function sampleScatterPlot(weightedSample, fun = demandModel => (
    { x: demandModel.parameters.a, y: demandModel.parameters.b }
)) {
    const { particles, weights } = weightedSample
    const data = _sampleData({ particles, weights, fun })
    const dots = _sampleDots(data)
    return {
        marks: dots,
    }
}

/**
 * @template {BaseDemandModel} T
 * @param {{ particles: T[], weights: number[], fun: SampleProjection<T> }} options
 */
function _sampleData({ particles, weights, fun }) {
    return particles.map((model, i) => ({
        ...fun(model),
        weight: weights[i],
    }))
}

/**
 * @param {{ x: number, y: number, weight: number }[]} data
 * @returns {import("@observablehq/plot").Markish[]}
 */
function _sampleDots(data) {
    const maxWeight = data.reduce((max, d) => Math.max(max, d.weight), 0)
    return [
        dot(data, { x: "x", y: "y", fill: "orange", stroke: "black", strokeWidth: 1, r: 3, opacity: d => d.weight / maxWeight }),
    ]
}

