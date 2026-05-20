/**
 * Returns the element with the given id, or throws if it is not found.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function requireElement(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Required element #${id} not found`);
    return el;
}
