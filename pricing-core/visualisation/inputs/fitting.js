import { range, button, form, table } from '@observablehq/inputs'

let dataMap = new Map();
let currentPrice = 150;

/**
 * Callback function for button
 * @param {number} price 
 * @param {boolean} conversion
 * @returns {void}
 */
function addInput(price, conversion) {
    price = Number(price); // Ensure price is a number for consistent map key lookup
    let entry = dataMap.get(price)
    if (entry) {
        entry.looks += 1;
        if (conversion) entry.books += 1;
    } else {
        dataMap.set(price, { price, looks: 1, books: conversion ? 1 : 0 })
    }
}

export function clearData() {
    dataMap.clear();
}

export function getData() {
    return Array.from(dataMap.values(), d => ({ ...d }));
}

/**
 * Set a row of the dataMap
 * @param {{price: number, looks: number, books: number}} row
 */
export function setData({ price, looks, books }) {
    dataMap.set(price, { price, looks, books })
}

function _convert() {
    addInput(currentPrice, true)
}

function _reject() {
    addInput(currentPrice, false)
}

/**
 * Creates a form for price input and conversion/rejection at that price, and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {{priceSlider: HTMLInputElement, conversionButtons: HTMLInputElement}} The slider and button input elements.
 */
export function fittingDataInput(element) {
    if (!(element instanceof HTMLElement)) {
        throw new Error('fittingDataInput: the provided element is not a valid HTMLElement.');
    }
    const priceSlider = range([50, 250], { step: 1, value: currentPrice, label: "Price" })
    priceSlider.addEventListener(
        "input",
        /** @param {Event & {target: HTMLInputElement}} event */
        (event) => {
            currentPrice = Number(event.target.value);
        }
    )

    /** @type {any} */
    const buttonArray = [
        ["Convert", _convert],
        ["Reject", _reject],
    ];

    const conversionButtons = button(buttonArray)

    const _form = form([priceSlider, conversionButtons])
    element.append(_form);
    return { priceSlider, conversionButtons }
}

/**
 * Creates a table of the data in dataMap, and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLInputElement}} The data table.
 */
export function fittingDataTable(element) {
    const _table = table(
        Array.from(dataMap.values()),
        {
            header: { price: "Price (£)", looks: "Looks", books: "Books" }, // Existing header
            editable: false
        }
    )
    element.replaceChildren(_table)
    return _table
}

/**
 * Replace the dataMap with that supplied by the scenario
 * @param {Array<{price: number, looks: number, books: number}>} data 
 */
function setupScenario(data) {
    clearData();
    data.map(setData);
}

/**
 * Put a scenario button in.
 * @param {HTMLElement} element 
 * @param {object} spec
 * @param {string} spec.buttonText
 * @param {Array<{price: number, looks: number, books: number}>} spec.data
 * @returns 
 */
export function scenarioButton(element, { buttonText, data }) {
    /** @type {any} */
    const options = { reduce: () => setupScenario(data) };
    const _button = button(buttonText, options);

    if (!(element instanceof HTMLElement)) {
        throw new Error('scenarioButton: the provided element is not a valid HTMLElement.');
    }
    element.append(_button)
    return _button
}
