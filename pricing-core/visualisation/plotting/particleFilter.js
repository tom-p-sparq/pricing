import { ruleY, ruleX, lineY, crosshair, tip, pointer, dot } from "@observablehq/plot";
import { range } from 'd3';
import { ParticleFilterState } from '../../sampling/index.js'

/**
 * @template T
 */

/**
 * 
 * @param {ParticleFilterState<T>} filterState 
 */
export function sampleScatterPlot(filterState, fX = (x) => x.parameters.a, fY = (x) => x.parameters.b) {
    const { particles, weights } = filterState.current
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

