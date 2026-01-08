import * as Plot from '@observablehq/plot'
import * as d3 from 'd3'

/**
 * Generates a plot definition for a given demand model using Observable Plot.
 *
 * @param {import('../conversion/base.js').BaseDemandModel} model An instance of a class that extends `BaseDemandModel`.
 * @param {object} [options] Optional configuration for the plot.
 * @param {number} [options.max_price=400] The maximum price to plot on the x-axis.
 * @param {string} [options.title] The main title for the plot.
 * @param {string} [options.subtitle] The subtitle for the plot.
 * @returns {object} An Observable Plot object that can be rendered.
 */
export function create(
  model,
  { max_price = 400, title, subtitle } = {}
) {
  const data = d3.range(0, max_price, 1).map((p) => ({
    price: p,
    conversion: model.conversion(p),
  }))

  return Plot.plot({
    x: { label: 'Price' },
    y: { domain: [0, 1], grid: true, label: 'Conversion Rate' },
    marks: [Plot.lineY(data, { x: 'price', y: 'conversion' })],
    title: title || `${model.constructor.name} for conversion rates`,
    subtitle: subtitle || 'Clamped to [0, 1]',
  })
}
