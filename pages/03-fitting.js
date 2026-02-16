import { conversion, plotting, inputs, fitting } from './compiled-pricing-core.js'

// --- Gradient Ascent Setup ---
const modelClass = conversion.LogisticDemandModel;
const optimiser = new fitting.Adam();
let isRunning = false;
const stepsPerFrame = 100; // Number of optimization steps per animation frame

// Declare a model of type model class

/** @type {modelClass} */
let currentModel;

function gradientAscentLoop() {
    if (!isRunning) return;
    const oldParams = currentModel.paramValues;
    currentModel = optimiser.batchRun(currentModel, inputs.fittingData.get(), stepsPerFrame)
    const newParams = currentModel.paramValues;
    renderModel();
    // Schedule the next iteration using requestAnimationFrame for speed
    const maxAbsDiff = Math.max(...newParams.map((v, i) => Math.abs(v - oldParams[i])));
    if (maxAbsDiff < 1e-5) {
        console.log("Numerics converged!")
        isRunning = false;
    }
    if (isRunning) {
        requestAnimationFrame(gradientAscentLoop);
    }
}

function startGradientAscent() {
    if (!isRunning) {
        isRunning = true;
        optimiser.reset(currentModel); // Initialize Adam parameters on start
        console.log("Starting gradient ascent...");
        requestAnimationFrame(gradientAscentLoop); // Start the loop with requestAnimationFrame
    }
}

function mapDataToModel() {
    console.log("Entered `mapDataToModel`")
    // Impose a reference on a single data point;
    // interpolate two data points;
    // start numerics if more than two data points.
    // Reset Adam parameters and ensure gradient ascent is running
    const data = inputs.fittingData.get();
    const numPoints = data.length;
    if (numPoints === 1) {
        const { price, looks, books } = data[0];
        const referencePoint = {
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
            elasticity: -2,
        };
        currentModel = modelClass.from_reference(referencePoint);
        renderModel();
    }
    else if (numPoints === 2) {
        const points = data.map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        const point0 = points[0];
        const point1 = points[1];
        currentModel = modelClass.interpolate(point0, point1);
        renderModel();
    }
    else if (numPoints > 2) {
        if (!currentModel) {
            currentModel = modelClass.from_reference({
                price: 150,
                conversion: 0.5,
                elasticity: -2
            });
        }
        optimiser.reset(currentModel);
        startGradientAscent();
    }
}


const tableContainer = document.getElementById("data-table-container")
tableContainer.style.height = '250px'
tableContainer.style.overflowY = 'auto'

function renderTable() {
    inputs.fittingData.table(tableContainer)
}

function renderModel() {
    const data = inputs.fittingData.get();
    const fitPoints = data.map(d => ({
        price: d.price,
        conversion: d.books / d.looks
    }))

    const logLikelihood = currentModel ? fitting.logLikelihood(currentModel, data) : 0;

    const plot = plotting.conversionPlot({
        model: currentModel,
        fitPoints: fitPoints,
    })

    const info = {
        title: 'Maximum likelihood model',
        subtitle: currentModel ? `Log-Likelihood: ${logLikelihood.toFixed(4)}` : 'Add data to begin fitting a model.'
    };
    document.getElementById('model-plot-container').replaceChildren(
        plotting.plot({ ...plot, ...info })
    );
}

// Initialise
const { _, conversionButtons } = inputs.fittingData.input(document.getElementById("data-generation-container"));
renderTable();
renderModel(); // Render the initial empty model plot


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
    mapDataToModel();
}));
