import { conversion, plotting, Inputs, html } from './compiled-pricing-core.js'

// Static plot
const plotConfigs = [
    { modelClass: conversion.LinearDemandModel, title: 'Linear' },
    { modelClass: conversion.LogisticDemandModel, title: 'Logistic' },
    { modelClass: conversion.LogLogisticDemandModel, title: 'Log-logistic' },
    { modelClass: conversion.WeibullDemandModel, title: 'Weibull' },
    { modelClass: conversion.ConstantElasticityDemandModel, title: 'Constant elasticity' },
];

// Interactive plots
const interactiveReference = Inputs.form(
    {
        price: Inputs.range([50, 250], { step: 1, value: 150, label: "Reference price" }),
        elasticity: Inputs.range([-5, -0.1], { step: 0.1, value: -2, label: "Reference elasticity" }),
        conversion: Inputs.range([0.01, 0.99], { step: 0.01, value: 0.5, label: "Reference conversion" })
    },
    {
        template: ({ price, elasticity, conversion }) =>
            html`<div style="display: flex; align-items: center; justify-content: space-around; gap: 1em;">${price}${elasticity}${conversion}</div>`
    }
);
const interactiveInterpolants = Inputs.form(
    {
        price0: Inputs.range([50, 250], { step: 1, value: 100, label: "Price 1" }),
        conversion0: Inputs.range([0.01, 0.99], { step: 0.01, value: 0.7, label: "Conversion 1" }),
        price1: Inputs.range([50, 250], { step: 1, value: 150, label: "Price 2" }),
        conversion1: Inputs.range([0.01, 0.99], { step: 0.01, value: 0.5, label: "Conversion 2" }),
    },
    {
        template: (inputs) => html`<div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 1em;">
            <div>${inputs.price0}</div>
            <div>${inputs.price1}</div>
            <div>${inputs.conversion0}</div>
            <div>${inputs.conversion1}</div>
          </div>`
    }
);
// Place controls
document.getElementById('reference-controls-container').replaceChildren(interactiveReference);
document.getElementById('interpolants-controls-container').replaceChildren(interactiveInterpolants);

function renderReference() {
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.from_reference(interactiveReference.value),
        name: title,
    }));
    const comparisonPlot = plotting.createMultiModelConversionPlot({
        models: models,
        points: [interactiveReference.value],
        options: {
            title: 'The Conversion Model Zoo',
            subtitle: 'Specified by behaviour at a single reference price',
        }
    });
    document.getElementById('reference-comparison-container').replaceChildren(comparisonPlot);
}

function renderInterpolants() {
    // Get points
    let { price0, conversion0, price1, conversion1 } = interactiveInterpolants.value;
    const point0 = { price: price0, conversion: conversion0 };
    const point1 = { price: price1, conversion: conversion1 };
    // Create models and plot
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.interpolate(point0, point1),
        name: title,
    }));
    const comparisonPlot = plotting.createMultiModelConversionPlot({
        models: models,
        points: [point0, point1],
        options: {
            title: 'The Conversion Model Zoo',
            subtitle: 'Specified by interpolation between two points',
        }
    });
    document.getElementById('interpolants-comparison-container').replaceChildren(comparisonPlot);
}

// Set up listeners
interactiveInterpolants.addEventListener('input', renderInterpolants);
interactiveReference.addEventListener('input', renderReference);

// Initial renders
renderInterpolants();
renderReference();
