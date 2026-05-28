import { conversion, plotting, inputs, sampling } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const { Prior, Proposal, ParticleFilterState, createRng, distributions, steps } = sampling
const { Beta, Normal } = distributions
const { NormalStep } = steps
const { LogisticDemandModel } = conversion
const { conversionPlot, distribution2DPlot, sampleScatterPlot } = plotting

const RNG = createRng(92)
const modelPlotContainer = requireElement('model-plot-container');
const likelihoodRatioContainer = requireElement('likelihood-ratio-container');


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

const prior = new Prior(priorSpec, atReferencePrice(150), RNG)
const proposal = new Proposal(proposalSpec, RNG)
const pf = new ParticleFilterState(prior, proposal)

console.log(prior._dists)
console.log(pf.current.particles)
pf.update([{price: 100, looks: 5, books: 4}])
pf.update([{price: 150, looks: 10, books: 2}])
pf.update([{price: 200, looks: 10, books: 0}])
console.log(pf.current.weights)
console.log(pf.ess)

const tom = sampleScatterPlot(pf, (x) => x.conversion(150), (x) => x.elasticity(150))
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

const { particles, weights } = pf.current
const maxWeight = Math.max(...weights)
const _likelihoodRatioPlot = conversionPlot({
    model: particles.map((p, i) => ({ model: p, name: `Particle ${i}`, weight: weights[i] / maxWeight })),
    curveOptions: { z: 'name', stroke: 'orange', strokeOpacity: (d) => d.weight * 0.1 },
})
plotting.plot(likelihoodRatioContainer, _likelihoodRatioPlot)
