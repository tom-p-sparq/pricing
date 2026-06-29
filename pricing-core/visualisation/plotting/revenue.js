import { ruleY, lineY, crosshair, tip, pointer } from "@observablehq/plot";
import { modelData } from "./_models.js";

/**
 * @param {import("../../conversion/base.js").BaseConversionModel | Array<{model: import("../../conversion/base.js").BaseConversionModel, name: string}>} model
 * @param {number} [cost=0] The cost base to measure incremental revenue against.
 * @param {number} [maxPrice=400]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function incrementalRevenueCurvePlot(model, cost = 0, maxPrice = 400) {
  const data = modelData(model, maxPrice, (m, p) => ({ incrementalRevenue: m.conversion(p) * (p - cost) }))
  return { marks: _incrementalRevenueCurveMarks(data) }
}

/**
 * Generates the marks to Observable Plots.plot from incremental revenue curve data.
 * 
 * @param {Array<{price: number, incrementalRevenue: number, name: string}>} data 
 * @returns {import("@observablehq/plot").Markish[]}
 */
function _incrementalRevenueCurveMarks(data) {
  return [
    ruleY([0]),
    lineY(data, { x: "price", y: "incrementalRevenue", stroke: "name" }),
    crosshair(data, { x: "price", y: "incrementalRevenue" }),
    tip(data, pointer({ x: "price", y: "incrementalRevenue" })),
  ]
}