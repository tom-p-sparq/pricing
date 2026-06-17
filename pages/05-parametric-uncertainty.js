import { conversion, plotting, inputs, sampling } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const RNG = sampling.createRng(92)
const sampleSize = 2000

// Identify where to place inputs and plots
const priorSpecContainer = requireElement('prior-spec-container');
const priorCurveContainer = requireElement('prior-curve-container');
const dataGenerationContainer = requireElement('data-generation-container');
const dataTableContainer = requireElement('data-table-container');
const posteriorCurveContainer = requireElement('posterior-curve-container');

/**
 * Factory: given sampled {conversion0, conversion1} at two fixed prices, build a LogisticDemandModel
 * by interpolation through those two (price, conversion) points.
 * @param {number} price0
 * @param {number} price1
 * @returns {(params: {conversion0: number, conversion1: number}) => conversion.LogisticDemandModel}
 */
function interpolantFactory(price0, price1) {
    return ({ conversion0, conversion1 }) =>
        conversion.LogisticDemandModel.interpolate(
            { price: price0, conversion: conversion0 },
            { price: price1, conversion: conversion1 },
        )
}

/**
 * Inverse of the factory: project a sampled model back to (conversion at price0, conversion at price1)
 * for the 2D scatter plot of posterior parameter samples.
 * @param {number} price0
 * @param {number} price1
 * @returns {(demandModel: conversion.LogisticDemandModel) => {x: number, y: number}}
 */
function fromInterpolantPrices(price0, price1) {
    return (demandModel) => ({ x: demandModel.conversion(price0), y: demandModel.conversion(price1) })
}

// PRIOR FORM

const proposalSpec = {
    conversion0: { dist: sampling.steps.NormalStep, args: { sigma: 0.05 } },
    conversion1: { dist: sampling.steps.NormalStep, args: { sigma: 0.05 } },
}
const proposal = new sampling.Proposal(proposalSpec, RNG)

const priorSliders = inputs.interpolantsPriorForm(priorSpecContainer)

/**
 * Builds a priorSpec object from the current slider values.
 * @returns {{ conversion0: { dist: typeof sampling.distributions.Beta, args: { mean: number, sampleSize: number } }, conversion1: { dist: typeof sampling.distributions.Beta, args: { mean: number, sampleSize: number } } }}
 */
function buildPriorSpec() {
    const { conversion0Mean, conversion0SampleSize, conversion1Mean, conversion1SampleSize } = priorSliders.value
    return {
        conversion0: { dist: sampling.distributions.Beta, args: { mean: conversion0Mean, sampleSize: conversion0SampleSize } },
        conversion1: { dist: sampling.distributions.Beta, args: { mean: conversion1Mean, sampleSize: conversion1SampleSize } },
    }
}

let prior = new sampling.Prior(buildPriorSpec(), interpolantFactory(priorSliders.value.price0, priorSliders.value.price1), RNG)
let pf = new sampling.ParticleFilterState(prior, proposal, { N: sampleSize })

// PRIOR RENDER

function renderPrior() {
    const { price0, price1, conversion0Mean, conversion1Mean } = priorSliders.value
    const priorModelSample = Array.from({ length: sampleSize }, () => prior.sampleModel())
    const priorModelWeightedSample = {
        particles: priorModelSample,
        weights: priorModelSample.map(() => 1.0),
    }

    const priorModelWeightedSampleDistribution = plotting.sampleConversionDistribution(
        priorModelWeightedSample,
        { maxPrice: 400, dPrice: 4, anchorPrices: [price0, price1] },
    )

    const priorSpecificationPlot = plotting.specPointsPlot([
        { price: price0, conversion: conversion0Mean },
        { price: price1, conversion: conversion1Mean },
    ])

    plotting.plot(
        priorCurveContainer,
        priorModelWeightedSampleDistribution,
        priorSpecificationPlot,
        {
            title: 'Prior conversion curves',
            y: { domain: [0, 1], label: 'Conversion' }
        },
    )
}

// POSTERIOR RENDER

function renderPosterior() {
    const { price0, price1 } = priorSliders.value
    const posteriorModelWeightedSample = pf.current
    const posteriorModelWeightedSampleDistribution = plotting.sampleConversionDistribution(posteriorModelWeightedSample, { maxPrice: 400, dPrice: 4, anchorPrices: [price0, price1] })
    const fitPoints = inputs.fittingData.get()
        .filter(d => d.looks > 0)
        .map(({ price, books, looks }) => ({ price, conversion: books / looks }))
    plotting.plot(
        posteriorCurveContainer,
        posteriorModelWeightedSampleDistribution,
        plotting.fitPointsPlot(fitPoints),
        {
            title: `Posterior conversion curves`,
            y: { domain: [0, 1], label: 'Conversion' }
        },
    )
}

// PRIOR REACTIVITY

priorSliders.addEventListener('input', () => {
    const { price0, price1 } = priorSliders.value
    prior = new sampling.Prior(buildPriorSpec(), interpolantFactory(price0, price1), RNG)
    renderPrior()
})

// DATA INPUT

/** @type {{price: number, looks: number, books: number}[]} */
let prevData = []
const { conversionButtons } = inputs.fittingData.input(dataGenerationContainer)

conversionButtons.addEventListener('input', () => {
    const newData = inputs.fittingData.get()
    const prevMap = new Map(prevData.map(d => [d.price, d]))
    const delta = newData.flatMap(row => {
        const prev = prevMap.get(row.price) ?? { looks: 0, books: 0 }
        const dLooks = row.looks - prev.looks
        return dLooks > 0 ? [{ price: row.price, looks: dLooks, books: row.books - prev.books }] : []
    })
    pf.update(delta)
    prevData = newData
    inputs.fittingData.table(dataTableContainer)
    renderPosterior()
})

// IMPORT PRIOR BUTTON

const importPriorButton = document.createElement('button')
importPriorButton.textContent = 'Import current prior'
dataGenerationContainer.append(importPriorButton)

importPriorButton.addEventListener('click', () => {
    const { price0, price1 } = priorSliders.value
    const allData = inputs.fittingData.get().filter(d => d.looks > 0)
    prior = new sampling.Prior(buildPriorSpec(), interpolantFactory(price0, price1), RNG)
    pf = new sampling.ParticleFilterState(prior, proposal, { N: sampleSize })
    if (allData.length > 0) {
        pf.update(allData)
    }
    prevData = allData
    renderPosterior()
})

// INITIAL RENDER

renderPrior()
renderPosterior()
