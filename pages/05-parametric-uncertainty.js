import { conversion, plotting, inputs, sampling } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const { Prior, Proposal, ParticleFilterState, iidSampler, createRng, distributions, steps } = sampling
const { Beta, Normal } = distributions
const { NormalStep } = steps
const { LogisticDemandModel } = conversion
const { distribution2DPlot, sampleScatterPlot, sampleConversionCurves, sampleConversionDistribution, fitPointsPlot} = plotting

const RNG = createRng(92)
const referencePrice = 150
const sampleSize = 1000

// Identify where to place inputs and plots 
const priorParameterContainer = requireElement('prior-parameter-container');
const priorCurveContainer = requireElement('prior-curve-container');
const dataGenerationContainer = requireElement('data-generation-container');
const dataTableContainer = requireElement('data-table-container');
const posteriorParameterContainer = requireElement('posterior-parameter-container');
const posteriorCurveContainer = requireElement('posterior-curve-container');

// Create objects
const priorSpec = {
    conversion: [ Beta, { mean: 0.5, sampleSize: 10 }],
    elasticity: [ Normal, { mu: -2, sigma: 0.5 }],
}
const proposalSpec = {
    conversion: [ NormalStep, { sigma: 0.05 }],
    elasticity: [ NormalStep, { sigma: 0.1 }],
}

/**
 * Creates a factory function for the Prior. This factory takes sampled parameters
 * (conversion and elasticity) and constructs a LogisticDemandModel at a fixed
 * reference price.
 * @param {number} price The reference price for the demand model.
 * @returns {(params: {conversion: number, elasticity: number}) => conversion.LogisticDemandModel} A function that creates a model instance from parameters.
 */
function atReferencePrice(price) {
    return ({ conversion, elasticity }) => LogisticDemandModel.fromReference({ price, conversion, elasticity })
}

function fromReferencePrice(price) {
    return (demandModel) => ({x: demandModel.conversion(price), y: demandModel.elasticity(price)})
}

// PRIOR

const prior = new Prior(priorSpec, atReferencePrice(referencePrice), RNG)
const priorParameterSample = Array.from({ length: sampleSize }, () => prior.sample())
const priorModelSample = priorParameterSample.map((param) => prior.makeModel(param))
const priorModelWeightedSample = {
    particles: priorModelSample,
    weights: priorModelSample.map(() => 1.0),
}
const priorParameterWeightedSampleScatter = sampleScatterPlot(
    priorModelWeightedSample,
    fromReferencePrice(referencePrice),
)
const priorParameterDistributionHeatmap = distribution2DPlot(
    {
        parameterDist: prior._dists.conversion,
        parameterDomain: [0, 1],
        parameterName: 'Conversion',
    },
    {
        parameterDist: prior._dists.elasticity,
        parameterDomain: [-4, 0],
        parameterName: 'Elasticity',
    }
)
plotting.plot(
    priorParameterContainer,
    priorParameterDistributionHeatmap,
    priorParameterWeightedSampleScatter,
    { 
        title: 'This is a test', 
    },
)

const priorModelWeightedSampleDistribution = sampleConversionDistribution(priorModelWeightedSample, 400, 1)
plotting.plot(
    priorCurveContainer,
    priorModelWeightedSampleDistribution,
    { title: 'This is a test' },
)

// POSTERIOR

const proposal = new Proposal(proposalSpec, RNG)
const pf = new ParticleFilterState(prior, proposal, {N: sampleSize})

function renderPosterior() {
    const posteriorModelWeightedSample = pf.current
    const posteriorParameterWeightedSampleScatter = sampleScatterPlot(
        posteriorModelWeightedSample,
        fromReferencePrice(referencePrice),
    )
    plotting.plot(
        posteriorParameterContainer,
        posteriorParameterWeightedSampleScatter,
        {
            title: 'This is a test',
            x: {domain: [0, 1], label: "Conversion"},
            y: {label: "Elasticity", pretty: true},
        },
    )

    const posteriorModelWeightedSampleDistribution = sampleConversionDistribution(posteriorModelWeightedSample, 400, 1)
    const fitPoints = inputs.fittingData.get()
        .filter(d => d.looks > 0)
        .map(({ price, books, looks }) => ({ price, conversion: books / looks }))
    plotting.plot(
        posteriorCurveContainer,
        posteriorModelWeightedSampleDistribution,
        fitPointsPlot(fitPoints),
        { title: `This is a test ${pf.ess.toFixed(2)}` },
    )
}

// DATA INPUT

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

renderPosterior()
