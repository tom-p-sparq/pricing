import { range } from "d3";
import { ruleY, ruleX, lineY, crosshair, tip, pointer } from "@observablehq/plot";
import { BaseDemandModel } from "../../demand/base.js";
import { BaseObjectiveFunction } from "../../optimisation/objectiveFunctions/base.js";

/**
 * Plots an objective function curve against price.
 * Accepts either a single demand model or an array of named models for comparison.
 * In the single-model case, an optional `name` gives the curve a colour/legend
 * entry too — useful when overlaying it with another named curve (e.g. from a
 * different objective) via `plotting.plot()`.
 *
 * @param {BaseDemandModel | Array<{model: BaseDemandModel, name: string}>} demandModel
 * @param {BaseObjectiveFunction} objective
 * @param {number} [maxPrice=400]
 * @param {number} [minPrice=0]
 * @param {string} [name] Display name for the single-model case.
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function objectiveCurvePlot(demandModel, objective, maxPrice = 400, minPrice = 0, name) {
  const isArray = Array.isArray(demandModel)
  const named = isArray || name !== undefined
  const data = isArray
    ? demandModel.flatMap(({ model, name }) =>
        range(minPrice, maxPrice, 1).map(price => ({ price, name, objective: objective.J(model, price) }))
      )
    : range(minPrice, maxPrice, 1).map(price => ({ price, name, objective: objective.J(demandModel, price) }))
  return {
    marks: [
      ruleY([0]),
      lineY(data, { x: "price", y: "objective", stroke: named ? "name" : undefined }),
      crosshair(data, { x: "price", y: "objective" }),
      tip(data, pointer({ x: "price", y: "objective", stroke: named ? "name" : undefined })),
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

/**
 * A dashed reference rule marking a comparison price — e.g. the risk-neutral
 * optimum, for contrast against a risk-averse optimum. Compose with
 * `objectiveCurvePlot`/`optimalPricePlot` via `plotting.plot()`.
 *
 * @param {number} price
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function referencePricePlot(price) {
  return {
    marks: [
      ruleX([price], { strokeOpacity: 0.3, strokeDasharray: "4,4" }),
    ]
  }
}
