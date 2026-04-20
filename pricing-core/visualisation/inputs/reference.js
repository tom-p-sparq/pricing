import { range, form } from '@observablehq/inputs';
import { html } from 'htl';

/**
 * Creates a form for reference point input and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the form to.
 * @returns {HTMLInputElement} The form of input elements.
 */
export function referenceForm(element) {
    const _form = form(
        {
            price: range([50, 250], { step: 1, value: 150, label: "Reference price" }),
            elasticity: range([-5, -0.1], { step: 0.1, value: -2, label: "Reference elasticity" }),
            conversion: range([0.01, 0.99], { step: 0.01, value: 0.5, label: "Reference conversion" })
        },
        {
            /**
             * @param {{price: number, elasticity: number, conversion: number}} params
             */
            template: ({ price, elasticity, conversion }) =>
                html`<div style="display: flex; align-items: center; justify-content: space-around; gap: 1em;">${price}${elasticity}${conversion}</div>`
        }
    )
    if (!(element instanceof HTMLElement)) {
        throw new Error('referenceForm: the provided element is not a valid HTMLElement.');
    }
    element.append(_form);
    return _form
}