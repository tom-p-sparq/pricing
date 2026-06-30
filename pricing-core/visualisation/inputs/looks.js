import { range } from '@observablehq/inputs';

/**
 * Creates a slider for the Poisson expected looks parameter (λ) and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLElement & { value: number }} The slider input element.
 */
export function poissonLooksSlider(element) {
    const _slider = range([10, 500], {
        step: 10,
        value: 100,
        label: 'Expected looks (λ)',
    })
    if (!(element instanceof HTMLElement)) {
        throw new Error('poissonLooksSlider: the provided element is not a valid HTMLElement.');
    }
    element.append(_slider);
    return _slider
}
