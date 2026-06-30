import { conversion, plotting, inputs, optimisation, demand } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const MAX_PRICE = 400

const conversionCurveContainer = requireElement('conversion-model-curve-container')
const conversionSpecContainer = requireElement('conversion-model-spec-container')
const expectedProfitCurveContainer = requireElement('expected-profit-curve-container')
const expectedProfitSpecContainer = requireElement('expected-profit-spec-container')

const referenceForm = inputs.referenceForm(conversionSpecContainer)
const profitForm = inputs.profitSpecForm(expectedProfitSpecContainer)

function buildModel() {
    return conversion.LogisticConversionModel.fromReference(referenceForm.value)
}

function renderConversionCurve() {
    const model = buildModel()
    plotting.plot(
        conversionCurveContainer,
        plotting.conversionCurvePlot({ model }),
        plotting.specPointsPlot([referenceForm.value]),
        { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion' } },
        { title: 'Logistic Conversion Model', subtitle: 'Specified by reference point and elasticity' },
    )
}

function renderExpectedProfit() {
    const { lambda, cost } = profitForm.value
    const model = buildModel()
    const demandModel = new demand.PoissonDemandModel({ parameters: { lambda }, conversionModel: model })
    const objective = new optimisation.objectiveFunctions.ExpectedRevenue({ cost })
    const optimalPrice = optimisation.optimisePrice(objective, demandModel, 1, MAX_PRICE)
    const optimalProfit = objective.J(demandModel, optimalPrice)
    plotting.plot(
        expectedProfitCurveContainer,
        plotting.objectiveCurvePlot(demandModel, objective, optimalPrice, optimalProfit, MAX_PRICE),
        { x: { label: 'Price' }, y: { grid: true, label: 'Expected profit' } },
        { title: 'Expected Profit by Price', subtitle: `Optimal price: ${optimalPrice.toFixed(2)}` },
    )
}

referenceForm.addEventListener('input', () => {
    renderConversionCurve()
    renderExpectedProfit()
})
profitForm.addEventListener('input', renderExpectedProfit)

renderConversionCurve()
renderExpectedProfit()
