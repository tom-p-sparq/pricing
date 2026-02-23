import { conversion, plotting, inputs, fitting } from './compiled-pricing-core.js'

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

    const toPlot = modelSpecs.map(({ model, name, llh }) => ({
        model,
        name: llh === undefined ? name : `${name} (LLH: ${llh.toFixed(3)})`,
    }))
    const plot = plotting.conversionPlot({
        model: toPlot,
        fitPoints: fitPoints,
    })
    const options = {
        color: { legend: true },
        title: 'Maximum likelihood models',
    }
    plotting.plot(
        document.getElementById('model-plot-container'),
        plot,
        options,
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

renderTable();
renderModelPlots(); // Render the initial empty model plot
