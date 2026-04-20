import { ruleY, lineY, crosshair, tip, pointer } from "@observablehq/plot";
import { range, max } from "d3";
import { BaseDemandModel } from "../../conversion/base.js";

/**
 * Generates plot specification for a model or model array (with names)
 * 
 * @param {BaseDemandModel | Array<{model: BaseDemandModel, name: string}>} model Model or array of (model, name) pairs
 * @param {number} [cost=0] The cost base to measure incremental revenue against.
 * @param {number} [maxPrice=400]
 */
export function incrementalRevenuePlot(model, cost = 0, maxPrice = 400) {
  /** @type {Array<{price: number, incrementalRevenue: number, name: string|undefined}>} */
  let data;
  if (model instanceof BaseDemandModel) {
    data = _singleModelRevenueData(model, cost, maxPrice)
  }
  else if (Array.isArray(model)) {
    data = _multiModelRevenueData(model, cost, maxPrice)
  }
  else {
    data = [];
  }
  const curveMarks = _incrementalRevenueCurveMarks(data)
  return {
    x: { label: "Price" },
    y: { domain: [0, max(data, (d) => d.incrementalRevenue)], grid: true, label: "Incremental revenue", nice: true },
    marks: curveMarks,
  }
}

/**
 * Generates a plot definition for a single demand model using Observable Plot.
 *
 * @param {BaseDemandModel} model An instance of a class that extends `BaseDemandModel`.
 * @param {number} [cost=0] The cost base to measure incremental revenue against.
 * @param {number} [maxPrice=400] The maximum price to plot on the x-axis.
 * @returns {Array<{price: number, incrementalRevenue: number, name: string}>} (price, conversion) coordinates to plot in a curve
 */
function _singleModelRevenueData(model, cost = 0, maxPrice = 400) {
  return range(0, maxPrice, 1).map((p) => ({
    price: p,
    incrementalRevenue: model.conversion(p) * (p - cost),
    name: model.constructor.name,
  }))
}

/**
 * Generates a plot definition for a set of demand models using Observable Plot.
 *
 * @param {Array<{model: BaseDemandModel, name: string}>} models An array of objects, each with a `model` instance and a `name`.
 * @param {number} [cost=0] The cost base to measure incremental revenue against.
 * @param {number} [maxPrice=400] The maximum price to plot on the x-axis.
 * @returns {Array<{price: number, incrementalRevenue: number, name: string}>} (price, conversion, name) coordinates to plot in a set of named curves
 */
function _multiModelRevenueData(models, cost = 0, maxPrice = 400) {
  return models.flatMap(({ model, name }) =>
    range(0, maxPrice, 1).map((p) => ({
      price: p,
      incrementalRevenue: model.conversion(p) * (p - cost),
      name: name,
    }))
  );
}

/**
 * Generates the marks to Observable Plots.plot from incremental revenue curve data.
 * 
 * @param {Array<{price: number, incrementalRevenue: number, name: string}>} data 
 * @returns {Array<object>}
 */
function _incrementalRevenueCurveMarks(data) {
  return [
    ruleY([0]),
    lineY(data, { x: "price", y: "incrementalRevenue", stroke: "name" }),
    crosshair(data, { x: "price", y: "incrementalRevenue" }),
    tip(data, pointer({ x: "price", y: "incrementalRevenue" })),
  ]
}