import { range, form } from '@observablehq/inputs';
import { html } from 'htl';

/**
 * Creates a form for reference point input and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the form to.
 * @returns {HTMLInputElement} The form of input elements.
 */
export function interpolantsForm(element) {
    const _form = form(
        {
            price0: range([50, 250], { step: 1, value: 100, label: "Price 1" }),
            conversion0: range([0.01, 0.99], { step: 0.01, value: 0.7, label: "Conversion 1" }),
            price1: range([50, 250], { step: 1, value: 150, label: "Price 2" }),
            conversion1: range([0.01, 0.99], { step: 0.01, value: 0.5, label: "Conversion 2" }),
        },
        {
            /**
             * @param {{price0: number, conversion0: number, price1: number, conversion1: number}} inputs
             */
            template: (inputs) => html`<div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 1em;">
            <div>${inputs.price0}</div>
            <div>${inputs.price1}</div>
            <div>${inputs.conversion0}</div>
            <div>${inputs.conversion1}</div>
          </div>`
        }
    )
    if (!(element instanceof HTMLElement)) {
        throw new Error('interpolantsForm: the provided element is not a valid HTMLElement.');
    }
    element.append(_form);
    return _form
};