import { range } from "d3";
import { BaseDemandModel } from "../../conversion/base.js";

/**
 * Maps a model or named-model array to a flat data array, computing one
 * field per price point via `fn`.
 *
 * @template T
 * @param {BaseDemandModel | Array<{model: BaseDemandModel, name: string}>} model
 * @param {number} maxPrice
 * @param {(model: BaseDemandModel, price: number) => T} fn
 * @returns {Array<{price: number, name: string} & T>}
 */
export function modelData(model, maxPrice, fn) {
    if (model instanceof BaseDemandModel) {
        return range(0, maxPrice, 1).map(p => ({
            price: p,
            name: model.constructor.name,
            ...fn(model, p),
        }))
    }
    if (Array.isArray(model)) {
        return model.flatMap(({ model: m, name, ...rest }) =>
            range(0, maxPrice, 1).map(p => ({
                price: p,
                name,
                ...rest,
                ...fn(m, p),
            }))
        )
    }
    return []
}
