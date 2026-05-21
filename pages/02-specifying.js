import { conversion, plotting, inputs } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

// Static plot
const plotConfigs = [
    { modelClass: conversion.LinearDemandModel, title: 'Linear' },
    { modelClass: conversion.LogisticDemandModel, title: 'Logistic' },
    { modelClass: conversion.LogLogisticDemandModel, title: 'Log-logistic' },
    { modelClass: conversion.WeibullDemandModel, title: 'Weibull' },
    { modelClass: conversion.ConstantElasticityDemandModel, title: 'Constant elasticity' },
];

// Interactive plots
const interactiveReference = inputs.referenceForm(requireElement('reference-controls-container'));
const interactiveInterpolants = inputs.interpolantsForm(requireElement('interpolants-controls-container'));

// Containers
const referenceComparisonContainer = requireElement('reference-comparison-container');
const interpolantsComparisonContainer = requireElement('interpolants-comparison-container');

// Rendering functions

const singleReferenceTitles = {
    title: 'The Conversion Model Zoo',
    subtitle: 'Specified by behaviour at a single reference price',
    color: { legend: true },
}
const interpolantTitles = {
    title: 'The Conversion Model Zoo',
    subtitle: 'Specified by interpolation between two points',
    color: { legend: true },
}

function renderReference() {
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.fromReference(interactiveReference.value),
        name: title,
    }));
    const comparisonPlot = plotting.conversionPlot({
        model: models,
        specPoints: [interactiveReference.value],
    });
    plotting.plot(referenceComparisonContainer, comparisonPlot, singleReferenceTitles)
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
    const comparisonPlot = plotting.conversionPlot({
        model: models,
        specPoints: [point0, point1],
    });
    plotting.plot(interpolantsComparisonContainer, comparisonPlot, interpolantTitles)
}

// Set up listeners
interactiveInterpolants.addEventListener('input', renderInterpolants);
interactiveReference.addEventListener('input', renderReference);

// Initial renders
renderInterpolants();
renderReference();
