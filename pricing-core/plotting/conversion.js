import * as Plot from "@observablehq/plot";
import { range } from "d3";

/**
 * Generates a plot definition for a set of demand models using Observable Plot.
 *
 * @param {object} spec An object consisting of models, and (optionally) additional points and plotting options.
 * @param {Array<{model: import('../conversion/base.js').BaseDemandModel, name: string}>} spec.models An array of objects, each with a `model` instance and a `name`.
 * @param {Array<{price: number, conversion: number}>} [spec.points] Optional additional {price, conversion} points to plot.
 * @param {object} [spec.options] Optional configuration for the plot.
 * @param {number} [spec.options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [spec.options.title] The main title for the plot.
 * @param {string} [spec.options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function createMultiModelConversionPlot({models, points = [], options = {}}) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("`models` must be a non-empty array of {model, name} objects.");
  }

  const max_price = options.max_price || 400;
  const title = options.title || "Conversion Rates";
  const subtitle = options.subtitle;

  const data = models.flatMap(({ model, name }) =>
    range(0, max_price, 1).map((p) => ({
      price: p,
      conversion: model.conversion(p),
      name: name,
    }))
  );

  return Plot.plot({
    title: title,
    subtitle: subtitle,
    x: { label: "Price" },
    y: { domain: [0, 1], grid: true, label: "Conversion probability" },
    color: { legend: true },
    marks: [
      Plot.ruleY([0]),
      Plot.ruleX(points, {x: "price", strokeOpacity: 0.3 }),
      Plot.ruleY(points, {y: "conversion", strokeOpacity: 0.3 }),
      Plot.dot(points, {x: "price", y: "conversion", fill: "black"}),
      Plot.lineY(data, { x: "price", y: "conversion", stroke: "name" }),
      Plot.crosshair(data, { x: "price", y: "conversion", stroke: "name" }),
      Plot.tip(data, Plot.pointer({ x: "price", y: "conversion", stroke: "name" })),
    ],
  });
}

/**
 * Generates a plot definition for a single demand model using Observable Plot.
 *
 * @param {object} spec An object consisting of a model, and (optionally) additional points and plotting options.
 * @param {import('../conversion/base.js').BaseDemandModel} spec.model An instance of a class that extends `BaseDemandModel`.
 * @param {Array<{price: number, conversion: number}>} [spec.points] Optional additional {price, conversion} points to plot.
 * @param {object} [spec.options] Optional configuration for the plot.
 * @param {number} [spec.options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [spec.options.title] The main title for the plot.
 * @param {string} [spec.options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function createSingleModelConversionPlot({model, points = [], options = {}}) {
  const max_price = options.max_price || 400;
  const title = options.title || (model ? `Conversion rates: ${model.constructor.name}`: 'Conversion rates');
  const subtitle = options.subtitle;

  const data = model
    ? range(0, max_price, 1).map((p) => ({
        price: p,
        conversion: model.conversion(p),
      }))
    : [];
  return Plot.plot({
    title: title,
    subtitle: subtitle,
    x: { label: "Price" },
    y: { domain: [0, 1], grid: true, label: "Conversion probability" },
    marks: [
      Plot.ruleY([0]),
      Plot.ruleX(points, {x: "price", strokeOpacity: 0.3 }),
      Plot.ruleY(points, {y: "conversion", strokeOpacity: 0.3 }),
      Plot.dot(points, {x: "price", y: "conversion", fill: "black"}),
      Plot.lineY(data, { x: "price", y: "conversion" }),
      Plot.crosshair(data, { x: "price", y: "conversion" }),
      Plot.tip(data, Plot.pointer({ x: "price", y: "conversion" })),
    ],
  });
}
