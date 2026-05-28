import { conversion, plotting, inputs, sampling } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const { Prior, Proposal, ParticleFilterState, iidSampler, createRng, distributions, steps } = sampling
const { Beta, Normal } = distributions
const { NormalStep } = steps
const { LogisticDemandModel } = conversion
const { conversionPlot, distribution2DPlot, sampleScatterPlot } = plotting

const RNG = createRng(92)

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

// PRIOR

const prior = new Prior(priorSpec, atReferencePrice(150), RNG)
const priorParameterSample = Array.from({ length: 500 }, () => prior.sample())
const priorModelSample = priorParameterSample.map((param) => prior.makeModel(param))
const priorModelWeightedSample = {
    particles: priorModelSample,
    weights: priorModelSample.map(() => 1.0),
}
const priorParameterWeightedSampleScatter = sampleScatterPlot(
    priorModelWeightedSample,
    (x) => x.conversion(150),
    (x) => x.elasticity(150),
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
    { title: 'This is a test' },
)

const {particles, weights} = priorModelWeightedSample
const maxWeight = weights.reduce((max, w) => Math.max(max, w), 0)
const priorModelWeightedSampleCurves = conversionPlot({
    model: particles.map((p, i) => (
        { model: p, name: `Particle ${i}`, weight: weights[i] / maxWeight }
    )),
    curveOptions: { z: 'name', stroke: 'orange', strokeOpacity: (d) => d.weight * 0.1 },
})
plotting.plot(
    priorCurveContainer,
    priorModelWeightedSampleCurves,
    { title: 'This is a test' },
)

// POSTERIOR

const proposal = new Proposal(proposalSpec, RNG)
const pf = new ParticleFilterState(prior, proposal)

pf.update([{ price: 150, looks: 10, books: 6 }])
pf.update([{ price: 180, looks: 10, books: 2 }])
pf.update([{ price: 190, looks: 20, books: 0 }])
pf.update([{ price: 110, looks: 10, books: 8 }])


const posteriorParameterWeightedSampleScatter = sampleScatterPlot(
    pf.current,
    (x) => x.conversion(150),
    (x) => x.elasticity(150),
)
plotting.plot(
    posteriorParameterContainer,
    posteriorParameterWeightedSampleScatter,
    {
        title: 'This is a test',
        x: {domain: [0, 1], label: "Conversion"},
        y: {domain: [-4, 0], label: "Elasticity"},    
    },
)

const maxCurrentWeight = pf.current.weights.reduce((max, w) => Math.max(max, w), 0)
const posteriorModelWeightedSampleCurves = conversionPlot({
    model: pf.current.particles.map((p, i) => (
        { model: p, name: `Particle ${i}`, weight: pf.current.weights[i]/maxCurrentWeight }
    )),
    curveOptions: { z: 'name', stroke: 'orange', strokeOpacity: (d) => d.weight * 0.1 },
})
plotting.plot(
    posteriorCurveContainer,
    posteriorModelWeightedSampleCurves,
    { title: 'This is a test' },
)
