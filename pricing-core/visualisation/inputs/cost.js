import { range } from '@observablehq/inputs';

/**
 * Creates a slider for cost input and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLInputElement} The slider input element.
 */
export function costSlider(element) {
    const _slider = range([0, 150], {
        step: 1,
        value: 0,
        label: 'Incremental cost'
    })
    if (!(element instanceof HTMLElement)) {
        throw new Error('costSlider: the provided element is not a valid HTMLElement.');
    }
    element.append(_slider);
    return _slider
}