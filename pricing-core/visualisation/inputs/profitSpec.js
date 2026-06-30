import { range, form } from '@observablehq/inputs';
import { html } from 'htl';

/**
 * Creates a form for profit specification inputs (expected looks and cost).
 * @param {HTMLElement} element The DOM element to append the form to.
 * @returns {HTMLElement & { value: { lambda: number; cost: number } }} The form of input elements.
 */
export function profitSpecForm(element) {
    const _form = form(
        {
            lambda: range([10, 500], { step: 10, value: 100, label: 'Expected looks (λ)' }),
            cost: range([0, 150], { step: 1, value: 50, label: 'Cost' }),
        },
        {
            template: ({ lambda, cost }) =>
                html`<div style="display: flex; align-items: center; justify-content: space-around; gap: 1em;">${lambda}${cost}</div>`
        }
    )
    if (!(element instanceof HTMLElement)) {
        throw new Error('profitSpecForm: the provided element is not a valid HTMLElement.');
    }
    element.append(_form);
    return _form
}
