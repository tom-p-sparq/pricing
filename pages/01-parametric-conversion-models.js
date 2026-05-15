import { conversion, plotting, inputs } from '/pricing-core/index.js'

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
    const model = modelClass.from_reference(reference);
    const plot = plotting.conversionPlot({ model: model });
    const container = document.getElementById(containerId);
    if (container) plotting.plot(container, plot, { title: title })
});

// Interactive plot
const interactiveReference = inputs.referenceForm(
    document.getElementById('controls-container')
);

function render() {
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.from_reference(interactiveReference.value),
        name: title,
    }));
    const comparisonPlot = plotting.conversionPlot({
        model: models,
        specPoints: [interactiveReference.value],
    });
    const info = {
        title: 'The Conversion Model Zoo',
        subtitle: 'Comparing conversion probability models',
        color: { legend: true },
    }
    plotting.plot(
        document.getElementById('conversion-comparison-container'),
        comparisonPlot,
        info,
    );
}

interactiveReference.addEventListener('input', render);
render();