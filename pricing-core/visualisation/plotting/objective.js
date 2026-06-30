import { range } from "d3";
import { ruleY, ruleX, lineY, crosshair, tip, pointer } from "@observablehq/plot";

/**
 * Plots an objective function curve against price.
 * Accepts either a single demand model or an array of named models for comparison.
 *
 * @param {import("../../demand/base.js").BaseDemandModel | Array<{model: import("../../demand/base.js").BaseDemandModel, name: string}>} demandModel
 * @param {import("../../optimisation/objectiveFunctions/base.js").BaseObjectiveFunction} objective
 * @param {number} [maxPrice=400]
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function objectiveCurvePlot(demandModel, objective, maxPrice = 400) {
  const isArray = Array.isArray(demandModel)
  const data = isArray
    ? demandModel.flatMap(({ model, name }) =>
        range(0, maxPrice, 1).map(price => ({ price, name, objective: objective.J(model, price) }))
      )
    : range(0, maxPrice, 1).map(price => ({ price, objective: objective.J(demandModel, price) }))
  return {
    marks: [
      ruleY([0]),
      lineY(data, { x: "price", y: "objective", stroke: isArray ? "name" : undefined }),
      crosshair(data, { x: "price", y: "objective" }),
      tip(data, pointer({ x: "price", y: "objective" })),
    ]
  }
}

/**
 * Marks for the optimal price and objective value — a vertical rule at the
 * optimal price and a horizontal rule at the optimal objective. Compose with
 * `objectiveCurvePlot` via `plotting.plot()`.
 *
 * @param {number} optimalPrice
 * @param {number} optimalObjective
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function optimalPricePlot(optimalPrice, optimalObjective) {
  return {
    marks: [
      ruleX([optimalPrice], { strokeOpacity: 0.3 }),
      ruleY([optimalObjective], { strokeOpacity: 0.3 }),
    ]
  }
}
