import { conversion, plotting, inputs, fitting } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const modelSpec = {
    name: 'Logistic',
    optimiser: new fitting.Adam({ learningRate: 0.001 }),
    /** @type {conversion.BaseDemandModel} */
    model: new conversion.LogisticDemandModel({ a: 0, b: 0 }),
};
const stepsPerFrame = 200; // Number of optimization steps per animation frame

/** @param {Generator<conversion.BaseDemandModel>} fitGenerator */
function animateStep(fitGenerator) {
    const { value, done } = fitGenerator.next()
    if (!done) {
        modelSpec.model = value;
    }
    renderModel();
    if (!done) {
        requestAnimationFrame(() => animateStep(fitGenerator))
    }
}

function fitModelToData() {
    const data = inputs.fittingData.get();
    const fitGenerator = fitting.fit(
        modelSpec.model,
        modelSpec.optimiser,
        data,
        { batchSize: stepsPerFrame, epsilon: 1e-8 }
    )
    requestAnimationFrame(() => animateStep(fitGenerator))
}

const tableContainer = requireElement("data-table-container");
tableContainer.style.height = '250px'
tableContainer.style.overflowY = 'auto'

const modelPlotContainer = requireElement('model-plot-container');

function renderTable() {
    inputs.fittingData.table(tableContainer)
}

function renderModel() {
    const data = inputs.fittingData.get();
    const fitPoints = data.map(d => ({
        price: d.price,
        conversion: d.books / d.looks
    }))

    const logLikelihood = fitting.logLikelihood(modelSpec.model, data);

    const plot = plotting.conversionPlot({
        model: modelSpec.model,
        fitPoints: fitPoints,
    })
    const options = {
        title: 'Maximum likelihood model',
        subtitle: `Log-Likelihood: ${logLikelihood.toFixed(4)}`
    };
    plotting.plot(modelPlotContainer, plot, options);
}

// Initialise
const { conversionButtons } = inputs.fittingData.input(requireElement("data-generation-container"));
renderTable();
renderModel(); // Render the initial empty model plot


// --- Scenario Buttons ---

const scenario = [
    { price: 140, looks: 10, books: 6 }, // 60%
    { price: 150, looks: 11, books: 6 },
    { price: 155, looks: 9, books: 6 },
    { price: 160, looks: 10, books: 4 }, // 40%
]

const scenarioButton = inputs.fittingData.scenario(
    requireElement("scenario-button-container"),
    {
        buttonText: 'Set up Scenario',
        data: scenario,
    },
)

const buttons = [conversionButtons, scenarioButton]
buttons.map(button => button.addEventListener("input", () => {
    renderTable();
    fitModelToData();
}));
