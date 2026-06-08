import { ruleY, ruleX, dot, lineY, crosshair, tip, pointer } from "@observablehq/plot";
import { BaseDemandModel } from "../../conversion/base.js";
import { modelData } from "./_models.js";


/**
 * @param {object} args
 * @param {BaseDemandModel | Array<{model: BaseDemandModel, name: string}>} args.model
 * @param {object} [args.curveOptions]
 * @param {number} [maxPrice=400]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function conversionCurvePlot({ model, curveOptions }, maxPrice = 400) {
  const data = modelData(model, maxPrice, (m, p) => ({ conversion: m.conversion(p) }))
  return { marks: _conversionCurveMarks(data, curveOptions) }
}

/**
 * @param {Array<{price: number, conversion: number}>} points
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function specPointsPlot(points) {
  return { marks: _specPointMarks(points) }
}

/**
 * Generates the marks to Observable Plots.plot from conversion curve data.
 * 
 * @param {Array<{price: number, conversion: number, name: string}>} data 
 * @returns {Array<object>}
 */
function _conversionCurveMarks(data, curveOptions = {}) {
  return [
    ruleY([0]),
    lineY(data, { x: "price", y: "conversion", stroke: "name", ...curveOptions }),
    crosshair(data, { x: "price", y: "conversion" }),
    tip(data, pointer({ x: "price", y: "conversion", stroke: "name" })),
  ]
}

/**
 * Generates the marks to Observable Plots.plot from conversion point specification data.
 * 
 * @param {Array<{price: number, conversion: number}>} points 
 * @returns {Array<object>}
 */
function _specPointMarks(points) {
  return [
    ruleX(points, { x: "price", strokeOpacity: 0.3 }),
    ruleY(points, { y: "conversion", strokeOpacity: 0.3 }),
    dot(points, { x: "price", y: "conversion", fill: "black" }),
  ]
}

/**
 * Generates the marks to Observable Plots.plot from conversion fit data.
 *
 * @param {Array<{price: number, conversion: number}>} points
 * @returns {Array<object>}
 */
function _fitPointMarks(points) {
  return [
    dot(points, { x: "price", y: "conversion", fill: "black" }),
  ]
}

/**
 * Returns a plot spec of observed conversion data points, composable with other specs via `plot()`.
 *
 * @param {Array<{price: number, conversion: number}>} points
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function fitPointsPlot(points) {
  return { marks: _fitPointMarks(points) }
}
