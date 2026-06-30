import { conversion, plotting, inputs, optimisation, demand } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

// Interactive inputs
const costSlider = inputs.costSlider(requireElement('cost-container'));

// Static plot
const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};
const model = conversion.LogisticConversionModel.fromReference(reference);
plotting.plot(
    requireElement('conversion-container'),
    plotting.conversionCurvePlot({ model }),
    { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
    { title: 'Example conversion model' },
)

// Interactive plot
const incrementalRevenueContainer = requireElement('incremental-revenue-container');
function render() {
    const objective = new optimisation.objectiveFunctions.ExpectedRevenue({ cost: costSlider.value })
    const demandModel = new demand.FixedDemandModel({ parameters: { n: 1 }, conversionModel: model })
    const optimalPrice = optimisation.optimisePrice(objective, demandModel, 1, 400)
    const optimalObjective = objective.J(demandModel, optimalPrice)
    plotting.plot(
        incrementalRevenueContainer,
        plotting.objectiveCurvePlot(demandModel, objective),
        plotting.optimalPricePlot(optimalPrice, optimalObjective),
        { x: { label: 'Price' }, y: { grid: true, label: 'Incremental revenue', nice: true } },
        { title: 'Modelled expected incremental revenue' },
    )
}

costSlider.addEventListener('input', render)
render()
