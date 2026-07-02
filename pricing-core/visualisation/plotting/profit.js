import { ruleY, ruleX, dot, tip, pointer } from "@observablehq/plot"

/**
 * Plots one or more named discrete profit distributions as a lollipop chart
 * (a stem plus a dot per outcome). A lollipop reads correctly here where a
 * banded bar chart would not: the named series generally have different,
 * non-aligned profit values (different margins), so there is no shared
 * category axis to bin bars against.
 *
 * @param {{profit: number, probability: number, name: string}[]} data
 * @returns {{ marks: import("@observablehq/plot").Markish[] }}
 */
export function profitDistributionPlot(data) {
  return {
    marks: [
      ruleY([0]),
      ruleX(data, { x: "profit", y1: 0, y2: "probability", stroke: "name", strokeOpacity: 0.5 }),
      dot(data, { x: "profit", y: "probability", fill: "name" }),
      tip(data, pointer({ x: "profit", y: "probability", fill: "name" })),
    ]
  }
}
