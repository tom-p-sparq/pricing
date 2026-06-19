import { conversion, plotting, inputs } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

// Static plot
const plotConfigs = [
    { modelClass: conversion.LinearConversionModel, title: 'Linear' },
    { modelClass: conversion.LogisticConversionModel, title: 'Logistic' },
    { modelClass: conversion.LogLogisticConversionModel, title: 'Log-logistic' },
    { modelClass: conversion.WeibullConversionModel, title: 'Weibull' },
    { modelClass: conversion.ConstantElasticityConversionModel, title: 'Constant elasticity' },
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
    plotting.plot(
        referenceComparisonContainer,
        plotting.conversionCurvePlot({ model: models }),
        plotting.specPointsPlot([interactiveReference.value]),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
        singleReferenceTitles,
    )
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
    plotting.plot(
        interpolantsComparisonContainer,
        plotting.conversionCurvePlot({ model: models }),
        plotting.specPointsPlot([point0, point1]),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
        interpolantTitles,
    )
}

// Set up listeners
interactiveInterpolants.addEventListener('input', renderInterpolants);
interactiveReference.addEventListener('input', renderReference);

// Initial renders
renderInterpolants();
renderReference();
