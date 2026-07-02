import { range } from '@observablehq/inputs';

/**
 * Creates a slider for the mean-variance risk aversion coefficient (ρ) and appends it to a given element.
 * @param {HTMLElement} element The DOM element to append the slider to.
 * @returns {HTMLElement & { value: number }} The slider input element.
 */
export function riskAversionSlider(element) {
    const _slider = range([0, 0.05], {
        step: 0.0005,
        value: 0.01,
        label: 'Risk aversion (ρ)',
    })
    if (!(element instanceof HTMLElement)) {
        throw new Error('riskAversionSlider: the provided element is not a valid HTMLElement.');
    }
    element.append(_slider);
    return _slider
}
