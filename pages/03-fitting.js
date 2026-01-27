import { conversion, plotting, Inputs, fitting } from './compiled-pricing-core.js'

let dataMap = new Map();
let currentPrice = 150;

// --- Gradient Ascent Setup ---
const modelClass = conversion.WeibullDemandModel;
const optimiser = new fitting.Adam();
let isRunning = false;
const stepsPerFrame = 100; // Number of optimization steps per animation frame

// Initialize a default model (e.g., LogLogisticDemandModel)
// This reference point is arbitrary; adjust as needed for your application.
// const initialReference = { price: 100, conversion: 0.5, elasticity: -2 };
let currentModel

function gradientAscentLoop() {
    if (!isRunning) return;
    const oldParams = currentModel.paramValues;
    currentModel = optimiser.batchRun(currentModel, Array.from(dataMap.values()), stepsPerFrame)
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
    mapDataToModel();
}

function mapDataToModel() {
    // Impose a reference on a single data point;
    // interpolate two data points;
    // start numerics if more than two data points.
    // Reset Adam parameters and ensure gradient ascent is running
    const numPoints = dataMap.size;
    if (numPoints === 1) {
        const referencePoint = Array.from(dataMap.values()).map(
            ({ price, looks, books }) => ({
                price: price,
                conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
                elasticity: -2
            })
        );
        currentModel = modelClass.from_reference(referencePoint[0]);
        renderModel();
    }
    else if (numPoints === 2) {
        const points = Array.from(dataMap.values()).map(({ price, looks, books }) => ({
            price: price,
            conversion: Math.max(0.0001, Math.min(0.9999, books / looks)),
        }));
        const point0 = points[0];
        const point1 = points[1];
        currentModel = modelClass.interpolate(point0, point1);
        renderModel();
    }
    else if (numPoints > 2) {
        optimiser.reset(currentModel);
        startGradientAscent();
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
// renderModel(); // Render the initial model
// Optionally, you can start gradient ascent automatically on page load:
// startGradientAscent();
