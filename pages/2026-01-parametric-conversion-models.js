import { conversion, plotting, Inputs, html } from './compiled-pricing-core.js'

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
    const plot = plotting.createSingleModelConversionPlot({ model: model, options: { title } });
    const container = document.getElementById(containerId);
    if (container) {
        container.replaceChildren(plot);
    }
});

// Interactive plot
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
document.getElementById('controls-container').replaceChildren(interactiveReference);

function render() {
    const models = plotConfigs.map(({ modelClass, title }) => ({
        model: modelClass.from_reference(interactiveReference.value),
        name: title,
    }));
    const comparisonPlot = plotting.createMultiModelConversionPlot({
        models: models,
        points: [interactiveReference.value],
        options: {
            title: 'The Conversion Model Zoo',
            subtitle: 'Comparing conversion probability models',
        }
    });
    document.getElementById('conversion-comparison-container').replaceChildren(comparisonPlot);
}

interactiveReference.addEventListener('input', render);
render();