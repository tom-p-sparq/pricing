import { conversion, plotting, Inputs, fitting } from './compiled-pricing-core.js'

let dataMap = new Map();
let currentPrice = 150; // Initial price for data input

// --- Gradient Ascent Setup ---
let currentModel;
let isRunning = false;

// Adam optimizer parameters
const learningRate = 0.05; // Adam's alpha
const beta1 = 0.9; // Adam's beta1
const beta2 = 0.999; // Adam's beta2
const epsilon = 1e-8; // Small constant to prevent division by zero
let m = {}; // First moment vector
let v = {}; // Second moment vector
let t = 0; // Time step for bias correction

// New variables for rendering frequency
const renderEveryN = 100; // Render every N iterations
let iterationCount = 0; // Counter for iterations

// Initialize a default model (e.g., LogLogisticDemandModel)
// This reference point is arbitrary; adjust as needed for your application.
const initialReference = { price: 100, conversion: 0.5, elasticity: -2 };
currentModel = conversion.LogLogisticDemandModel.from_reference(initialReference);

/**
 * Initializes or resets the Adam optimizer's moment vectors and time step.
 * @param {BaseDemandModel} model The current demand model.
 */
function initializeAdamParameters(model) {
    m = Object.fromEntries(model.paramNames.map(name => [name, 0]));
    v = Object.fromEntries(model.paramNames.map(name => [name, 0]));
    t = 0;
    iterationCount = 0; // Reset iteration count when parameters are initialized
}

function gradientAscentLoop() {
    if (!isRunning) return;

    iterationCount++; // Increment iteration count

    const points = Array.from(dataMap.values()).map(d => ({
        price: d.price,
        looks: d.looks,
        books: d.books
    }));

    if (points.length > 0) {
        const grad = fitting.gradLogLikelihood(currentModel, points);

        if (grad === undefined) {
            console.log("Gradient is undefined, skipping optimization step.");
        } else {
            t++; // Increment time step for bias correction

            const newParamEntries = currentModel.paramEntries.map(([name, value]) => {
                const g_t = grad[name];

                // Update biased first and second moment estimates
                m[name] = beta1 * m[name] + (1 - beta1) * g_t;
                v[name] = beta2 * v[name] + (1 - beta2) * g_t * g_t;

                // Compute bias-corrected first and second moment estimates
                const m_hat = m[name] / (1 - Math.pow(beta1, t));
                const v_hat = v[name] / (1 - Math.pow(beta2, t));

                // Update parameter using Adam rule
                value += learningRate * m_hat / (Math.sqrt(v_hat) + epsilon);
                return [name, value];
            });
            const newParams = Object.fromEntries(newParamEntries);
            const ModelClass = Object.getPrototypeOf(currentModel).constructor;
            currentModel = new ModelClass(newParams);
            renderModel(); // Update the plot with the new model
            // Only render every N iterations
            if (iterationCount % renderEveryN === 0) {
                renderModel(); // Update the plot with the new model
            }
        }
    }

    // Schedule the next iteration using requestAnimationFrame for speed
    if (isRunning) { // Check again in case isRunning changed during the current iteration
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

function stopGradientAscent() {
    if (isRunning) {
        isRunning = false;
        console.log("Stopping gradient ascent.");
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
    initializeAdamParameters(currentModel);
    startGradientAscent();
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
    document.getElementById("data-table-container").replaceChildren(
        Inputs.table(
            Array.from(dataMap.values()),
            { header: { price: "Price (£)", looks: "Looks", books: "Books" }, editable: false }
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

// --- Gradient Ascent Controls ---
const gradientControls = Inputs.button([
    ["Start Gradient Ascent", startGradientAscent],
    ["Stop Gradient Ascent", stopGradientAscent],
]);

// Initialise
document.getElementById("data-generation-container").replaceChildren(interactiveDataInput)
document.getElementById("gradient-controls-container").replaceChildren(gradientControls);
renderTable()
renderModel(); // Render the initial model
// Optionally, you can start gradient ascent automatically on page load:
// startGradientAscent();
