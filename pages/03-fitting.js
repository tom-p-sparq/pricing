import { conversion, plotting, Inputs, fitting } from './compiled-pricing-core.js'

let dataMap = new Map();
let currentPrice = 150;

// --- Gradient Ascent Setup ---
let currentModel;
let isRunning = false;

// Adam optimizer parameters
const learningRate = 0.01; // Adam's alpha
const beta1 = 0.9; // Adam's beta1
const beta2 = 0.999; // Adam's beta2
const epsilon = 1e-8; // Small constant to prevent division by zero
let m = {}; // First moment vector
let v = {}; // Second moment vector
let t = 0; // Time step for bias correction

// New variables for batching and rendering frequency
const stepsPerFrame = 100; // Number of optimization steps per animation frame
const renderEveryNFrames = 1; // Render every N frames
let frameCount = 0; // Counter for frames

// Initialize a default model (e.g., LogLogisticDemandModel)
// This reference point is arbitrary; adjust as needed for your application.
const initialReference = { price: 100, conversion: 0.5, elasticity: -2 };
currentModel = conversion.WeibullDemandModel.from_reference(initialReference);

/**
 * Initializes or resets the Adam optimizer's moment vectors and time step.
 * @param {BaseDemandModel} model The current demand model.
 */
function initializeAdamParameters(model) {
    m = Object.fromEntries(model.paramNames.map(name => [name, 0]));
    v = Object.fromEntries(model.paramNames.map(name => [name, 0]));
    t = 0;
    frameCount = 0; // Reset frame count
}

function gradientAscentLoop() {
    if (!isRunning) return;

    frameCount++;

    // Perform a batch of optimization steps
    for (let i = 0; i < stepsPerFrame; i++) {
        const points = Array.from(dataMap.values()).map(d => ({
            price: d.price,
            looks: d.looks,
            books: d.books
        }));

        if (points.length === 0) break; // No data to process

        const grad = fitting.gradLogLikelihood(currentModel, points);

        if (grad === undefined) {
            console.log("Gradient is undefined, stopping optimization for this frame.");
            break; // Stop this batch if gradient is non-finite
        }

        t++; // Increment time step for bias correction

        const newParamEntries = currentModel.paramEntries.map(([name, value]) => {
            const g_t = grad[name];

            // Update biased first and second moment estimates
            m[name] = beta1 * m[name] + (1 - beta1) * g_t;
            v[name] = beta2 * v[name] + (1 - beta2) * (g_t * g_t);

            // Compute bias-corrected first and second moment estimates
            const m_hat = m[name] / (1 - Math.pow(beta1, t));
            const v_hat = v[name] / (1 - Math.pow(beta2, t));

            // Update parameter using Adam rule
            value += (learningRate * m_hat) / (Math.sqrt(v_hat) + epsilon);
            return [name, value];
        });

        const newParams = Object.fromEntries(newParamEntries);
        const ModelClass = Object.getPrototypeOf(currentModel).constructor;
        currentModel = new ModelClass(newParams);
    }

    // Only render every N frames to keep the UI responsive
    if (frameCount % renderEveryNFrames === 0) {
        renderModel();
    }

    // Schedule the next iteration using requestAnimationFrame for speed
    if (isRunning) {
        requestAnimationFrame(gradientAscentLoop);
    }
}

function startGradientAscent() {
    if (!isRunning) {
        isRunning = true;
        initializeAdamParameters(currentModel); // Initialize Adam parameters on start
        console.log("Starting gradient ascent...");
        requestAnimationFrame(gradientAscentLoop); // Start the loop with requestAnimationFrame
    }
}

// --- Existing UI Elements ---
function addInput(price, conversion) {
    price = Number(price); // Ensure price is a number for consistent map key lookup
    let entry = dataMap.get(price)
    if (entry) {
        entry.looks += 1;
        if (conversion) entry.books += 1;
    } else {
        dataMap.set(price, { price, looks: 1, books: conversion ? 1 : 0 })
    }
    renderTable();
    // When new data comes in, reset Adam parameters and ensure gradient ascent is running
    // Do nothing for a single data point; interpolate two data points; start numerics if more than two data points
    if (dataMap.size > 2) {
        initializeAdamParameters(currentModel);
        startGradientAscent();
    } else if (dataMap.size === 2) {
        const points = Array.from(dataMap.values()).map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        const point0 = points[0];
        const point1 = points[1];
        currentModel = currentModel.constructor.interpolate(point0, point1);
        renderModel();
    } else if (dataMap.size === 1) {
        const referencePoint = Array.from(dataMap.values()).map(
            ({ price, looks, books }) => ({
                price: price,
                conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
                elasticity: -2
            })
        );
        currentModel = currentModel.constructor.from_reference(referencePoint[0]);
        renderModel();
    }
}

const priceSlider = Inputs.range([50, 250], { step: 1, value: currentPrice, label: "Price" })
priceSlider.addEventListener("input", (event) => {
    currentPrice = Number(event.target.value); // Ensure currentPrice is always a number
})

const conversionButtons = Inputs.button([
    ["Convert", () => addInput(currentPrice, true)],
    ["Reject", () => addInput(currentPrice, false)],
])
const interactiveDataInput = Inputs.form([priceSlider, conversionButtons])

function renderTable() {
    const tableContainer = document.getElementById("data-table-container")
    tableContainer.style.height = '250px'
    tableContainer.style.overflowY = 'auto'
    tableContainer.replaceChildren(
        Inputs.table(
            Array.from(dataMap.values()),
            {
                header: { price: "Price (£)", looks: "Looks", books: "Books" }, // Existing header
                editable: false
            }
        )
    )
}

// --- New Model Rendering Function ---
function renderModel() {
    const pointsForPlot = Array.from(dataMap.values()).map(d => ({
        price: d.price,
        conversion: d.books / d.looks
    }));
    const currentLogLikelihood = fitting.logLikelihood(currentModel, Array.from(dataMap.values()));
    const comparisonPlot = plotting.createSingleModelConversionPlot({
        model: currentModel,
        points: pointsForPlot,
        options: {
            title: 'Fitted Demand Model (Gradient Ascent)',
            subtitle: `Log-Likelihood: ${currentLogLikelihood.toFixed(4)}`
        }
    });
    document.getElementById('model-plot-container').replaceChildren(comparisonPlot);
}

// Initialise
document.getElementById("data-generation-container").replaceChildren(interactiveDataInput)
renderTable()
renderModel(); // Render the initial model
// Optionally, you can start gradient ascent automatically on page load:
// startGradientAscent();
