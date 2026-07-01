import { range } from '@observablehq/inputs';

/**
 * Creates a slider for the Poisson expected looks parameter (λ) and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLElement & { value: number }} The slider input element.
 */
export function poissonLooksSlider(element) {
    const _slider = range([0.1, 50], {
        step: 0.1,
        value: 10,
        label: 'Expected looks (λ)',
    })
    if (!(element instanceof HTMLElement)) {
        throw new Error('poissonLooksSlider: the provided element is not a valid HTMLElement.');
    }
    element.append(_slider);
    return _slider
}

/**
 * Creates a slider for the fixed (deterministic) number of looks (n) and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLElement & { value: number }} The slider input element.
 */
export function fixedLooksSlider(element) {
    const _slider = range([1, 200], {
        step: 1,
        value: 50,
        label: 'Number of looks (n)',
    })
    if (!(element instanceof HTMLElement)) {
        throw new Error('fixedLooksSlider: the provided element is not a valid HTMLElement.');
    }
    element.append(_slider);
    return _slider
}
