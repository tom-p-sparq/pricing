import { conversion, plotting, inputs, fitting } from './compiled-pricing-core.js'

const modelSpecs = [
    { name: 'Logistic', optimiser: new fitting.Adam(), model: new conversion.LogisticDemandModel({ a: 0, b: 0 }) },
    { name: 'Log Logistic', optimiser: new fitting.Adam(), model: new conversion.LogLogisticDemandModel({ a: 0, b: 0 }) },
    { name: 'Weibull', optimiser: new fitting.Adam(), model: new conversion.WeibullDemandModel({ a: 0, b: 0 }) },
]
let isRunning = false;
const stepsPerFrame = 100; // Number of optimization steps per animation frame


function gradientAscentLoop() {
    if (!isRunning) return;
    const maxAbsDiffs = modelSpecs.map((spec) => {
        const oldParams = spec.model.paramValues;
        spec.model = spec.optimiser.batchRun(spec.model, inputs.fittingData.get(), stepsPerFrame)
        const newParams = spec.model.paramValues;
        return Math.max(...newParams.map((v, i) => Math.abs(v - oldParams[i])));
    });
    renderModelPlots();
    const maxAbsDiff = Math.max(...maxAbsDiffs);
    if (maxAbsDiff < 1e-5) {
        console.log("Numerics converged!")
        isRunning = false;
    }
    // Schedule the next iteration using requestAnimationFrame for speed
    if (isRunning) {
        requestAnimationFrame(gradientAscentLoop);
    }
}

function startGradientAscent() {
    if (!isRunning) {
        isRunning = true;
        modelSpecs.forEach(({ optimiser, model }) => {
            optimiser.reset(model); // Initialize Adam parameters on start
        })
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
        modelSpecs.forEach(spec => {
            spec.model = spec.model.constructor.from_reference(referencePoint);
        });
        renderModelPlots();
    }
    else if (numPoints === 2) {
        const points = data.map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        modelSpecs.forEach(spec => {
            spec.model = spec.model.constructor.interpolate(points[0], points[1]);
        });
        renderModelPlots();
    }
    else if (numPoints > 2) {
        startGradientAscent();
    }
}


const tableContainer = document.getElementById("data-table-container")
tableContainer.style.height = '250px'
tableContainer.style.overflowY = 'auto'

function renderTable() {
    inputs.fittingData.table(tableContainer)
}

function renderModelPlots() {
    const data = inputs.fittingData.get();
    const fitPoints = data.map(d => ({
        price: d.price,
        conversion: d.books / d.looks
    }))

    // const models = modelSpecs.map((spec) => { model: spec.model, name: spec.name })
    // const logLikelihoods = modelSpecs.map(spec => fitting.logLikelihood(spec.model, data));

    const plot = plotting.conversionPlot({
        model: modelSpecs,
        fitPoints: fitPoints,
    })

    document.getElementById('model-plot-container').replaceChildren(
        plotting.plot({
            ...plot,
            color: {legend: true},
            title: 'Maximum likelihood models',
        })
    )
}

// Initialise
const { _, conversionButtons } = inputs.fittingData.input(document.getElementById("data-generation-container"));
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
    mapDataToModel();
}));
