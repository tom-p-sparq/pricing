import { conversion, plotting, Inputs, html } from './compiled-pricing-core.js'

let dataMap = new Map();
let currentPrice = 150;

function addInput(price, conversion) {
    let entry = dataMap.get(price)
    if (entry) {
        entry.looks += 1;
        if (conversion) entry.books += 1;
    } else {
        dataMap.set(price, { price, looks: 1, books: conversion ? 1 : 0 })
    }
    renderTable()
}

const priceSlider = Inputs.range([50, 250], { step: 1, value: currentPrice, label: "Price" })
priceSlider.addEventListener("input", (event) => {
    currentPrice = event.target.value;
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

// Initialise
document.getElementById("data-generation-container").replaceChildren(interactiveDataInput)
renderTable()
