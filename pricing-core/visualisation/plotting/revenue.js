import { range } from "d3";
import { ruleY, ruleX, lineY, crosshair, tip, pointer } from "@observablehq/plot";
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

/**
 * Plots an objective function curve against price, with vertical and horizontal
 * markers at the pre-computed optimum. Accepts any `BaseObjectiveFunction`.
 *
 * @param {import("../../demand/base.js").BaseDemandModel} demandModel
 * @param {import("../../optimisation/objectiveFunctions/base.js").BaseObjectiveFunction} objective
 * @param {number} optimalPrice Pre-computed optimal price (from `optimisePrice`).
 * @param {number} optimalObjective Objective value at `optimalPrice`.
 * @param {number} [maxPrice=400]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function objectiveCurvePlot(demandModel, objective, optimalPrice, optimalObjective, maxPrice = 400) {
  const data = range(0, maxPrice, 1).map(price => ({
    price,
    objective: objective.J(demandModel, price),
  }))
  return {
    marks: [
      ruleY([0]),
      lineY(data, { x: "price", y: "objective" }),
      ruleX([optimalPrice], { stroke: "steelblue", strokeDasharray: "4,3" }),
      ruleY([optimalObjective], { stroke: "steelblue", strokeDasharray: "4,3" }),
      crosshair(data, { x: "price", y: "objective" }),
      tip(data, pointer({ x: "price", y: "objective" })),
    ]
  }
}