import { conversion, plotting, inputs } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

// Static plot
const plotConfigs = [
    { modelClass: conversion.LinearDemandModel, title: 'Linear', containerId: 'linear-conversion-container' },
    { modelClass: conversion.LogisticDemandModel, title: 'Logistic', containerId: 'logistic-conversion-container' },
    { modelClass: conversion.LogLogisticDemandModel, title: 'Log-logistic', containerId: 'log-logistic-conversion-container' },
    { modelClass: conversion.WeibullDemandModel, title: 'Weibull', containerId: 'weibull-conversion-container' },
    { modelClass: conversion.ConstantElasticityDemandModel, title: 'Constant elasticity', containerId: 'constant-elasticity-conversion-container' },
];

const reference = {
    price: 150,
    elasticity: -2,
    conversion: 0.5,
};

plotConfigs.forEach(({ modelClass, title, containerId }) => {
    const model = modelClass.fromReference(reference);
    plotting.plot(
        requireElement(containerId),
        plotting.conversionCurvePlot({ model }),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
        { title },
    );
});

// Interactive plot
const interactiveReference = inputs.referenceForm(requireElement('controls-container'));
const comparisonContainer = requireElement('conversion-comparison-container');

function render() {
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.fromReference(interactiveReference.value),
        name: title,
    }));
    plotting.plot(
        comparisonContainer,
        plotting.conversionCurvePlot({ model: models }),
        plotting.specPointsPlot([interactiveReference.value]),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
        { title: 'The Conversion Model Zoo', subtitle: 'Comparing conversion probability models', color: { legend: true } },
    );
}

interactiveReference.addEventListener('input', render);
render();