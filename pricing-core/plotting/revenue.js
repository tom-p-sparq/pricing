import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

/**
 * Generates a plot definition for a given demand model using Observable Plot.
 *
 * @param {import('../conversion/base.js').BaseDemandModel} model An instance of a class that extends `BaseDemandModel`.
 * @param {number} [cost=0] Baseline marginal cost of sale.
 * @param {object} [options] Optional configuration for the plot.
 * @param {number} [options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [options.title] The main title for the plot.
 * @param {string} [options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function createIncrementalRevenuePlot(
  model,
  cost = 0,
  { max_price = 400, title, subtitle } = {}
) {
  const data = d3.range(0, max_price, 1).map((p) => ({
    price: p,
    incrementalRevenue: model.conversion(p) * (p - cost),
  }));
  return Plot.plot({
    x: { label: "Price" },
    y: { domain: [0, d3.max(data, (d) => d.incrementalRevenue)], grid: true, label: "Incremental revenue", nice: true },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(data, { x: "price", y: "incrementalRevenue" }),
      Plot.crosshair(data, { x: "price", y: "incrementalRevenue" }),
      Plot.tip(data, Plot.pointer({ x: "price", y: "incrementalRevenue" })),
    ],
    title: title || `${model.constructor.name} for incremental revenue`,
    subtitle: subtitle,
  });
}
