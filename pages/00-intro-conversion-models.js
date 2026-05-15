import { conversion, plotting, inputs } from '/pricing-core/index.js'

// Interactive inputs
const costSlider = inputs.costSlider(
    document.getElementById('cost-container')
);

// Static plot
const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};
const model = conversion.LogisticDemandModel.from_reference(reference);
const conversionPlot = plotting.conversionPlot({ model: model, });
plotting.plot(
    document.getElementById('conversion-container'),
    conversionPlot,
    { title: 'Example conversion model' },
)

// Interactive plot
function render() {
    const incrementalRevenuePlot = plotting.incrementalRevenuePlot(model, costSlider.value)
    plotting.plot(
        document.getElementById('incremental-revenue-container'),
        incrementalRevenuePlot,
        { title: 'Modelled expected incremental revenue' },
    )
}

costSlider.addEventListener('input', render)
render()
