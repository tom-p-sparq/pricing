import { conversion, plotting, inputs, fitting } from '/pricing-core/index.js'

const modelSpecs = [
    {
        name: 'Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        model: new conversion.LogisticDemandModel({ a: 0, b: 0 }),
        llh: undefined,
    },
    {
        name: 'Log Logistic',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        model: new conversion.LogLogisticDemandModel({ a: 0, b: 0 }),
        llh: undefined,
    },
    {
        name: 'Weibull',
        optimiser: new fitting.Adam({ learningRate: 0.001 }),
        model: new conversion.WeibullDemandModel({ a: Math.log(Math.log(2)), b: 0 }),
        llh: undefined,
    },
]
const stepsPerFrame = 200; // Number of optimization steps per animation frame

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

const tableContainer = document.getElementById("data-table-container")
tableContainer.style.height = '250px'
tableContainer.style.overflowY = 'auto'

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
    const _incrementalRevenuePlot = plotting.incrementalRevenuePlot(modelSpecs, costSlider.value)

    const _conversionOptions = {
        color: { legend: true },
        title: 'Maximum likelihood models',
    }
    const _logLikelihoodOptions = {
        title: 'Selection via log-likelihood ratio'
    }

    plotting.plot(
        document.getElementById('model-plot-container'),
        _conversionPlot,
        _conversionOptions,
    )
    plotting.plot(
        document.getElementById('likelihood-ratio-container'),
        _logLikelihoodPlot,
        _logLikelihoodOptions,
    )
    plotting.plot(
        document.getElementById('incremental-revenue-container'),
        _incrementalRevenuePlot,
        { title: 'Modelled expected incremental revenue' },
    )
}

// Initialise
const { conversionButtons } = inputs.fittingData.input(
    document.getElementById("data-generation-container")
);
conversionButtons.addEventListener("input", () => {
    renderTable();
    fitModelToData();
});

const costSlider = inputs.costSlider(
    document.getElementById('cost-container')
);
costSlider.addEventListener("input", renderModelPlots);

renderTable();
renderModelPlots(); // Render the initial empty model plot
