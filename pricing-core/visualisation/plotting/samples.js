import { ruleY, ruleX, lineY, areaY, crosshair, tip, pointer, dot } from "@observablehq/plot";
import { range } from 'd3';
import { BaseDemandModel } from "/pricing-core/conversion/index.js";

/**
 * Projects a demand model onto a 2-D point for scatter plotting.
 * @template {BaseDemandModel} T
 * @callback SampleProjection
 * @param {T} demandModel
 * @returns {{ x: number, y: number }}
 */

// API

/**
 * @template {BaseDemandModel} T
 * @param {{ particles: T[], weights: number[] }} weightedSample
 * @param {SampleProjection<T>} [fun] - Defaults to plotting parameters `a` vs `b`.
 */
export function sampleScatterPlot(weightedSample, fun = demandModel => (
    { x: demandModel.parameters.a, y: demandModel.parameters.b }
)) {
    const data = _sampleProjectionData(weightedSample, fun )
    const dots = _sampleDots(data)
    return {
        marks: dots,
    }
}

/**
 * @param {{ particles: BaseDemandModel[], weights: number[] }} weightedSample
 * @param {{ maxPrice?: number, dPrice?: number }} [opts]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function sampleConversionCurves(weightedSample, { maxPrice = 400, dPrice = 1 } = {}) {
    const prices = range(0, maxPrice, dPrice)
    const data = _sampleConversionData(weightedSample, prices)
    const curveMarks = _conversionCurveMarks(data)
    return {marks: curveMarks}
}

/**
 * @param {{ particles: BaseDemandModel[], weights: number[] }} weightedSample
 * @param {{ maxPrice?: number, dPrice?: number, anchorPrices?: number[] }} [opts]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function sampleConversionDistribution(weightedSample, { maxPrice = 400, dPrice = 1, anchorPrices = [] } = {}) {
    const baseGrid = range(0, maxPrice, dPrice)
    const prices = anchorPrices.length > 0
        ? [...new Set([...baseGrid, ...anchorPrices])].sort((a, b) => a - b)
        : baseGrid
    const data = _sampleQuantileData(weightedSample, prices)
    return _conversionDistributionMarks(data)
}

// DATA

/**
 * @template {BaseDemandModel} T
 * @param {{ particles: T[], weights: number[]}} weightedSample
 * @param {SampleProjection<T>} fun
 */
function _sampleProjectionData({ particles, weights }, fun ) {
    return particles.map((model, i) => ({
        ...fun(model),
        weight: weights[i],
    }))
}

/**
 * @typedef {{ idx: number, price: number, conversion: number, weight: number }} ConversionSample
 */

/**
 * @param {{ particles: BaseDemandModel[], weights: number[] }} weightedSample
 * @param {number[]} prices
 * @returns {ConversionSample[]}
 */
function _sampleConversionData({ particles, weights }, prices) {
    return prices.flatMap((price) =>
        particles.map(
            (model, i) => ({idx: i, price: price, conversion: model.conversion(price), weight: weights[i]})
        )
    )
}

/**
 * @typedef {{ price: number, q05: number, q25: number, q50: number, q75: number, q95: number }} QuantileSample
 */

/**
 * @param {{ particles: BaseDemandModel[], weights: number[] }} weightedSample
 * @param {number[]} prices
 * @returns {QuantileSample[]}
 */
function _sampleQuantileData({ particles, weights }, prices) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    return prices.map(price => {
        const sorted = particles
            .map((model, i) => ({ conversion: model.conversion(price), weight: weights[i] }))
            .sort((a, b) => a.conversion - b.conversion)
        const quantile = (/** @type {number} */ q) => {
            const target = q * totalWeight
            let cumWeight = 0
            for (const { conversion, weight } of sorted) {
                cumWeight += weight
                if (cumWeight >= target) return conversion
            }
            return sorted[sorted.length - 1].conversion
        }
        return { price, q05: quantile(0.05), q25: quantile(0.25), q50: quantile(0.5), q75: quantile(0.75), q95: quantile(0.95) }
    })
}

// DATA TO MARKS

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

/**
 * @param {ConversionSample[]} data
 * @returns {import("@observablehq/plot").Markish[]}
 */
function _conversionCurveMarks(data) {
    const maxWeight = data.reduce((max, d) => Math.max(max, d.weight), 0)
    return [
        ruleY([0]),
        lineY(data, { x: "price", y: "conversion", stroke: d => `Particle`, z: "idx", strokeOpacity: (d) => 0.4 * d.weight / maxWeight}),
        crosshair(data, { x: "price", y: "conversion" }),
        tip(data, pointer({ x: "price", y: "conversion", stroke: d => `Particle ${d.idx}` })),
    ]
}

/**
 * @param {QuantileSample[]} data
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
function _conversionDistributionMarks(data) {
    return {
        marks: [
            ruleY([0]),
            areaY(data, { x: "price", y1: "q05", y2: "q95", fill: "orange", fillOpacity: 0.2 }),
            areaY(data, { x: "price", y1: "q25", y2: "q75", fill: "orange", fillOpacity: 0.4 }),
            lineY(data, { x: "price", y: "q50", stroke: "orange" }),
        ]
    }
}