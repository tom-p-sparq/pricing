import { conversion, plotting, inputs } from '/pricing-core/index.js'
import { requireElement } from '/utils.js'

// Interactive inputs
const costSlider = inputs.costSlider(requireElement('cost-container'));

// Static plot
const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};
const model = conversion.LogisticDemandModel.from_reference(reference);
const conversionPlot = plotting.conversionPlot({ model: model, });
plotting.plot(
    requireElement('conversion-container'),
    conversionPlot,
    { title: 'Example conversion model' },
)

// Interactive plot
const incrementalRevenueContainer = requireElement('incremental-revenue-container');
function render() {
    const incrementalRevenuePlot = plotting.incrementalRevenuePlot(model, costSlider.value)
    plotting.plot(
        incrementalRevenueContainer,
        incrementalRevenuePlot,
        { title: 'Modelled expected incremental revenue' },
    )
}

costSlider.addEventListener('input', render)
render()
