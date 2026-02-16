import { conversion, plotting, Inputs } from './compiled-pricing-core.js'

// Interactive inputs
const costSlider = Inputs.range([0, 150], {
    step: 1,
    value: 0,
    label: 'Incremental cost'
});
document.getElementById('cost-container').append(costSlider);

// Static plot
const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};
const model = conversion.WeibullDemandModel.from_reference(reference);
const conversionPlot = plotting.conversionPlot({ model: model, });
document.getElementById('conversion-container').replaceChildren(
    plotting.plot({
        ...conversionPlot,
        title: 'Example conversion model',
    })
)

// Interactive plot
function render() {
    const incrementalRevenuePlot = plotting.incrementalRevenuePlot(model, costSlider.value)
    document.getElementById('incremental-revenue-container').replaceChildren(
        plotting.plot({
            ...incrementalRevenuePlot,
            title: 'Modelled expected incremental revenue',
        })
    )
}

costSlider.addEventListener('input', render)
render()
