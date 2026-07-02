/**
 * @param {number[]} values
 * @returns {number}
 */
export function logSumExp(values) {
    const max = values.reduce((m, v) => Math.max(m, v), -Infinity)
    return max + Math.log(values.reduce((sum, v) => sum + Math.exp(v - max), 0))
}
