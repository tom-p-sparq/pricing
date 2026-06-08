import { conversion, plotting, inputs, fitting } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const modelSpecs = [
    {
        name: 'Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseDemandModel} */
        model: new conversion.LogisticDemandModel({ a: 0, b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
    {
        name: 'Log Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseDemandModel} */
        model: new conversion.LogLogisticDemandModel({ a: 0, b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
    {
        name: 'Weibull',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseDemandModel} */
        model: new conversion.WeibullDemandModel({ a: Math.log(Math.log(2)), b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
]
const stepsPerFrame = 200; // Number of optimization steps per animation frame

/** @param {Generator<conversion.BaseDemandModel>[]} fitGenerators */
function animateStep(fitGenerators) {
    const stepped = fitGenerators.map(
        generator => generator.next()
    )
    modelSpecs.forEach((modelSpec, i) => {
        const { value, done } = stepped[i]
        if (!done) {
            modelSpec.model = value;
            modelSpec.llh = fitting.logLikelihood(modelSpec.model, inputs.fittingData.get())
        }
    })
    renderModelPlots();
    const all_done = stepped.every(step => step.done)
    if (!all_done) {
        requestAnimationFrame(() => animateStep(fitGenerators))
    }
}

function fitModelToData() {
    const data = inputs.fittingData.get();
    const fitGenerators = modelSpecs.map(
        ({ model, optimiser }) => fitting.fit(
            model,
            optimiser,
            data,
            { batchSize: stepsPerFrame, epsilon: 1e-8 })
    )
    requestAnimationFrame(() => animateStep(fitGenerators))
}

const tableContainer = requireElement("data-table-container");
tableContainer.style.height = '250px'
tableContainer.style.overflowY = 'auto'

const modelPlotContainer = requireElement('model-plot-container');
const likelihoodRatioContainer = requireElement('likelihood-ratio-container');
const incrementalRevenueContainer = requireElement('incremental-revenue-container');

function renderTable() {
    inputs.fittingData.table(tableContainer)
}

function renderModelPlots() {
    const data = inputs.fittingData.get();
    const fitPoints = data.map(({ price, books, looks }) => ({
        price: price,
        conversion: books / looks
    }))

    const toConversionPlot = modelSpecs.map(({ model, name, llh }) => ({
        model,
        name: llh === undefined ? name : `${name} (LLH: ${llh.toFixed(3)})`,
    }))
    const toLogLikelihoodPlot = modelSpecs.map(({ name, llh }) => ({
        name,
        llh: llh === undefined ? 0 : llh,
    }))

    const _conversionPlot = plotting.conversionPlot({
        model: toConversionPlot,
        fitPoints: fitPoints,
    })
    const _logLikelihoodPlot = plotting.logLikelihoodPlot(toLogLikelihoodPlot)
    plotting.plot(modelPlotContainer, _conversionPlot, { color: { legend: true }, title: 'Maximum likelihood models' })
    plotting.plot(likelihoodRatioContainer, _logLikelihoodPlot, { title: 'Selection via log-likelihood ratio' })
    plotting.plot(
        incrementalRevenueContainer,
        plotting.incrementalRevenueCurvePlot(modelSpecs, costSlider.value),
        { x: { label: 'Price' }, y: { grid: true, label: 'Incremental revenue', nice: true } },
        { title: 'Modelled expected incremental revenue' },
    )
}

// Initialise
const { conversionButtons } = inputs.fittingData.input(requireElement("data-generation-container"));
conversionButtons.addEventListener("input", () => {
    renderTable();
    fitModelToData();
});

const costSlider = inputs.costSlider(requireElement('cost-container'));
costSlider.addEventListener("input", renderModelPlots);

renderTable();
renderModelPlots(); // Render the initial empty model plot
