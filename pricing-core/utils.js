/**
 * @param {number[]} values
 * @returns {number}
 */
export function logSumExp(values) {
    const max = values.reduce((m, v) => Math.max(m, v), -Infinity)
    // All −∞ (an empty sum) or any +∞: the result is max itself, and the shift below would give NaN.
    if (!Number.isFinite(max)) return max
    return max + Math.log(values.reduce((sum, v) => sum + Math.exp(v - max), 0))
}
