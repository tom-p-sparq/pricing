import { ruleY, ruleX, dot, lineY, crosshair, tip, pointer } from "@observablehq/plot";
import { range } from "d3";
import { BaseDemandModel } from "../../conversion/base.js";


/**
 * Generates plot specification for a model or model array (with names)
 * 
 * @param {object} args
 * @param {BaseDemandModel | Array<{model: BaseDemandModel, name: string}>} args.model
 * @param {Array<{price: number, conversion: number}>} [args.specPoints]
 * @param {Array<{price: number, conversion: number}>} [args.fitPoints]
 * @param {object} args.curveOptions
 * @param {number} [maxPrice=400]
 */
export function conversionPlot({ model, specPoints, fitPoints, curveOptions }, maxPrice = 400) {
  /** @type {Array<{price: number, conversion: number, name: string}>} */
  let data;
  if (model instanceof BaseDemandModel) {
    data = _singleModelConversionData(model, maxPrice)
  }
  else if (Array.isArray(model)) {
    data = _multiModelConversionData(model, maxPrice)
  }
  else {
    data = [];
  }
  const curveMarks = _conversionCurveMarks(data, curveOptions)
  const specPointMarks = specPoints ? _specPointMarks(specPoints) : []
  const fitPointMarks = fitPoints ? _fitPointMarks(fitPoints) : []
  return {
    x: { label: "Price" },
    y: { domain: [0, 1], grid: true, label: "Conversion", nice: true },
    marks: [...curveMarks, ...specPointMarks, ...fitPointMarks],
  }
}

/**
 * Generates a plot definition for a single demand model using Observable Plot.
 *
 * @param {BaseDemandModel} model An instance of a class that extends `BaseDemandModel`.
 * @param {number} [maxPrice=400] The maximum price to plot on the x-axis.
 * @returns {Array<{price: number, conversion: number, name: string}>} (price, conversion) coordinates to plot in a curve
 */
function _singleModelConversionData(model, maxPrice = 400) {
  return range(0, maxPrice, 1).map((p) => ({
    price: p,
    conversion: model.conversion(p),
    name: model.constructor.name,
  }))
}

/**
 * Generates a plot definition for a set of demand models using Observable Plot.
 *
 * @param {Array<{model: BaseDemandModel, name: string}>} models An array of objects, each with a `model` instance and a `name`.
 * @param {number} [maxPrice=400] The maximum price to plot on the x-axis.
 * @returns {Array<{price: number, conversion: number, name: string}>} (price, conversion, name) coordinates to plot in a set of named curves
 */
function _multiModelConversionData(models, maxPrice = 400) {
  return models.flatMap(({ model, name, ...rest }) =>
    range(0, maxPrice, 1).map((p) => ({
      price: p,
      conversion: model.conversion(p),
      name: name,
      ...rest,
    }))
  );
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
