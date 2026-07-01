import { conversion, plotting, inputs, fitting, optimisation, demand } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const modelSpecs = [
    {
        name: 'Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseConversionModel} */
        model: new conversion.LogisticConversionModel({ a: 0, b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
    {
        name: 'Log Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseConversionModel} */
        model: new conversion.LogLogisticConversionModel({ a: 0, b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
    {
        name: 'Weibull',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        /** @type {conversion.BaseConversionModel} */
        model: new conversion.WeibullConversionModel({ a: Math.log(Math.log(2)), b: 0 }),
        /** @type {number | undefined} */
        llh: undefined,
    },
]
const stepsPerFrame = 200; // Number of optimization steps per animation frame

/** @param {Generator<conversion.BaseConversionModel>[]} fitGenerators */
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

    const _logLikelihoodPlot = plotting.logLikelihoodPlot(toLogLikelihoodPlot)
    plotting.plot(
        modelPlotContainer,
        plotting.conversionCurvePlot({ model: toConversionPlot }),
        plotting.fitPointsPlot(fitPoints),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
        { color: { legend: true }, title: 'Maximum likelihood models' },
    )
    plotting.plot(likelihoodRatioContainer, _logLikelihoodPlot, { title: 'Selection via log-likelihood ratio' })
    const objective = new optimisation.objectiveFunctions.ExpectedRevenue({ cost: costSlider.value })
    const toDemandModels = modelSpecs.map(({ model, name }) => ({
        model: new demand.FixedDemandModel({ parameters: { n: 1 }, conversionModel: model }),
        name,
    }))
    plotting.plot(
        incrementalRevenueContainer,
        plotting.objectiveCurvePlot(toDemandModels, objective, 400, Math.max(0, costSlider.value - 10)),
        { x: { label: 'Price' }, y: { grid: true, label: 'Incremental revenue', nice: true } },
        { color: { legend: true }, title: 'Modelled expected incremental revenue' },
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
