import { conversion, plotting, inputs, sampling } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const { Prior, Proposal, ParticleFilterState, createRng, distributions, steps } = sampling
const { Beta, Normal } = distributions
const { NormalStep } = steps
const { LogisticDemandModel } = conversion
const { distribution1DPlot, distribution2DPlot, sampleScatterPlot } = plotting

const RNG = createRng(92)
const modelPlotContainer = requireElement('model-plot-container');

const priorSpec = {
    conversion: [ Beta, { mean: 0.5, sampleSize: 5 }],
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

const prior = new Prior(priorSpec, atReferencePrice(150), RNG)
const proposal = new Proposal(proposalSpec, RNG)
const pf = new ParticleFilterState(prior, proposal)

console.log(prior._dists)
console.log(pf.current.particles)
const tom = sampleScatterPlot(pf, (x) => x.conversion(150), (x) => -2.0)

pf.update([{price: 120, looks: 7, books: 6}])
console.log(pf.current.weights)
console.log(pf.ess)


const _modelPlot = distribution2DPlot(
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
plotting.plot(modelPlotContainer, _modelPlot, tom, { title: 'This is a test' })
