import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

/**
 * Generates a plot definition for a given demand model using Observable Plot.
 *
 * @param {Array<{model: import('../conversion/base.js').BaseDemandModel, name: string}>} models An array of objects, each with a `model` instance and a `name`.
 * @param {object} [options] Optional configuration for the plot.
 * @param {number} [options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [options.title] The main title for the plot.
 * @param {string} [options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function createMultiModelConversionPlot(models, { max_price = 400, title, subtitle } = {}) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("`models` must be a non-empty array of {model, name} objects.");
  }

  const data = models.flatMap(({ model, name }) =>
    d3.range(0, max_price, 1).map((p) => ({
      price: p,
      conversion: model.conversion(p),
      name: name,
    }))
  );

  return Plot.plot({
    title: title || "Conversion Rates",
    subtitle: subtitle,
    x: { label: "Price" },
    y: { domain: [0, 1], grid: true, label: "Conversion probability" },
    color: { legend: true },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(data, { x: "price", y: "conversion", stroke: "name" }),
      Plot.crosshair(data, { x: "price", y: "conversion", stroke: "name" }),
      Plot.tip(data, Plot.pointer({ x: "price", y: "conversion", stroke: "name" })),
    ],
  });
}

/**
 * Generates a plot definition for a single demand model using Observable Plot.
 *
 * @param {import('../conversion/base.js').BaseDemandModel} model An instance of a class that extends `BaseDemandModel`.
 * @param {object} [options] Optional configuration for the plot.
 * @param {number} [options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [options.title] The main title for the plot.
 * @param {string} [options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function createSingleModelConversionPlot(
  model,
  { max_price = 400, title, subtitle } = {}
) {
  const data = d3.range(0, max_price, 1).map((p) => ({
    price: p,
    conversion: model.conversion(p),
  }));
  return Plot.plot({
    title: title || `${model.constructor.name} for conversion rates`,
    subtitle: subtitle,
    x: { label: "Price" },
    y: { domain: [0, 1], grid: true, label: "Conversion probability" },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(data, { x: "price", y: "conversion" }),
      Plot.crosshair(data, { x: "price", y: "conversion" }),
      Plot.tip(data, Plot.pointer({ x: "price", y: "conversion" })),
    ],
  });
}
