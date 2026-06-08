import { conversion, plotting, inputs } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

// Interactive inputs
const costSlider = inputs.costSlider(requireElement('cost-container'));

// Static plot
const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};
const model = conversion.LogisticDemandModel.fromReference(reference);
const conversionPlot = plotting.conversionPlot({ model: model, });
plotting.plot(
    requireElement('conversion-container'),
    conversionPlot,
    { title: 'Example conversion model' },
)

// Interactive plot
const incrementalRevenueContainer = requireElement('incremental-revenue-container');
function render() {
    plotting.plot(
        incrementalRevenueContainer,
        plotting.incrementalRevenueCurvePlot(model, costSlider.value),
        { x: { label: 'Price' }, y: { grid: true, label: 'Incremental revenue', nice: true } },
        { title: 'Modelled expected incremental revenue' },
    )
}

costSlider.addEventListener('input', render)
render()
