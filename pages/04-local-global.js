import { conversion, plotting, inputs, fitting } from './compiled-pricing-core.js'

const modelSpecs = [
    { name: 'Logistic', optimiser: new fitting.Adam({ learningRate: 0.001 }), model: new conversion.LogisticDemandModel({ a: 0, b: 0 }) },
    { name: 'Log Logistic', optimiser: new fitting.Adam({ learningRate: 0.001 }), model: new conversion.LogLogisticDemandModel({ a: 0, b: 0 }) },
    { name: 'Weibull', optimiser: new fitting.Adam({ learningRate: 0.001 }), model: new conversion.WeibullDemandModel({ a: 0, b: 0 }) },
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

    const plot = plotting.conversionPlot({
        model: modelSpecs,
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
renderTable();
renderModelPlots(); // Render the initial empty model plot

// --- Scenario Buttons ---

const scenario1 = [
    { price: 100, looks: 10, books: 5 },
    { price: 120, looks: 10, books: 4 },
]

const scenario2 = [
    { price: 140, looks: 10, books: 6 }, // 60%
    { price: 150, looks: 11, books: 6 },
    { price: 155, looks: 9, books: 6 },
    { price: 160, looks: 10, books: 4 }, // 40%
]

const scenario1Button = inputs.fittingData.scenario(
    document.getElementById("scenario-1-button-container"),
    {
        buttonText: 'Set up Scenario 1',
        data: scenario1,
    },
)
const scenario2Button = inputs.fittingData.scenario(
    document.getElementById("scenario-2-button-container"),
    {
        buttonText: 'Set up Scenario 2',
        data: scenario2,
    },
)

const buttons = [conversionButtons, scenario1Button, scenario2Button]
buttons.map(button => button.addEventListener("input", () => {
    renderTable();
    fitModelToData();
}));
