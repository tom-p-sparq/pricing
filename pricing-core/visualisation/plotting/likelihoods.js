import { cell, text } from "@observablehq/plot";
import { sort } from "d3";

/**
 * 
 * @param {{name: string, llh: number}[]} modelSpecs 
 */
export function logLikelihoodPlot(modelSpecs) {
    const sortedData = sort(modelSpecs, (a, b) => b.llh - a.llh);
    const pairs = sortedData.flatMap((d1, i) =>
        sortedData.slice(0, i).map((d2, j) => ({
            x: d1.name,
            y: d2.name,
            diff: d2.llh - d1.llh
        }))
    );
    return {
        style: {
            fontSize: 16,
        },
        marginLeft: 120,
        marginBottom: 60,
        padding: 0,
        aspectRatio: 1,
        grid: true,
        x: {
            domain: sortedData.map(d => d.name),
            label: "Model family (less likely)",
        },
        y: {
            domain: sortedData.map(d => d.name),
            label: "Model family (more likely)",
            textAnchor: "end",
        },
        color: {
            type: "linear",
            scheme: "Oranges",
            domain: [0, 12],
            legend: true,
            label: "Log-likelihood difference"
        },
        marks: [
            // The Heatmap Cells
            cell(pairs, {
                x: "x",
                y: "y",
                fill: "diff",
                inset: 0.5
            }),
            // The Text Labels
            text(pairs, {
                x: "x",
                y: "y",
                text: d => d.diff.toFixed(4),
                fill: d => Math.abs(d.diff) > 8 ? "white" : "black", // Dynamic contrast
            })
        ]
    }
}
