import { ruleY, lineY, crosshair, tip, pointer, raster } from "@observablehq/plot";
import { range } from 'd3';
import { BaseDistribution } from '../../sampling/distributions/index.js'

/**
 * @typedef {{ parameterValue: number, logPdf: number, pdf: number }} DistributionDatum
 */

/**
 * @typedef {Object} DistributionConfig
 * @property {BaseDistribution} parameterDist
 * @property {[number, number]} [parameterDomain=[0, 1]]
 * @property {string} [parameterName="Parameter"]
 */

/**
 * Builds Observable Plot marks for a 1D PDF line chart.
 * @param {DistributionConfig} config
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function distribution1DCurvePlot({parameterDist, parameterDomain = [0, 1]}) {
    const data = _distributionData({parameterDist, parameterDomain})
    return { marks: _pdfCurveMarks(data) }
}

/**
 * Builds Observable Plot marks for a 2D joint PDF contour chart.
 * @param {DistributionConfig} x - distribution config for the horizontal axis
 * @param {DistributionConfig} y - distribution config for the vertical axis
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function distribution2DContourPlot(x, y) {
    const dataX = _distributionData(x)
    const dataY = _distributionData(y)
    return { marks: _pdfContourMarks(dataX, dataY) }
}

/**
 * @param {DistributionConfig} config
 * @returns {DistributionDatum[]}
 */
function _distributionData({parameterDist, parameterDomain = [0, 1]}) {
    const dx = Math.abs(parameterDomain[1] - parameterDomain[0])/50;
    const points = range(parameterDomain[0], parameterDomain[1], dx)
    const data = points.map((x) => ({
        parameterValue: x,
        logPdf: parameterDist.logPdf(x),
        pdf: Math.exp(parameterDist.logPdf(x)),
    }))
    return data
}

/**
 * @param {DistributionDatum[]} data
 * @returns {import("@observablehq/plot").Markish[]}
 */
function _pdfCurveMarks(data) {
    return [
        ruleY([0]),
        lineY(data, { x: "parameterValue", y: "pdf" }),
        crosshair(data, { x: "parameterValue", y: "pdf" }),
        tip(data, pointer({ x: "parameterValue", y: "pdf" })),
    ]
}

/**
 * @param {DistributionDatum[]} dataX
 * @param {DistributionDatum[]} dataY
 * @returns {import("@observablehq/plot").Markish[]}
 */
function _pdfContourMarks(dataX, dataY) {
    const dataZ = dataX.flatMap((x) => dataY.map((y) => ({
        parameterValueX: x.parameterValue,
        parameterValueY: y.parameterValue,
        logPdf: x.logPdf + y.logPdf,
        pdf: Math.exp(x.logPdf + y.logPdf),
    })))
    return [
        raster(dataZ, { x: "parameterValueX", y: "parameterValueY", fill: "pdf", interpolate: 'barycentric' }),
    ]
}