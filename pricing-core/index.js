import { LinearDemandModel } from './conversion/Linear.js'
import { ConstantElasticityDemandModel } from './conversion/ConstantElasticity.js'
import { LogLogisticDemandModel } from './conversion/LogLogistic.js'
import { LogisticDemandModel } from './conversion/Logistic.js'
import { WeibullDemandModel } from './conversion/Weibull.js'
import * as plotting from './plotting/index.js'

/**
 * A namespace containing all available demand model classes.
 */
const conversion = {
  LinearDemandModel,
  ConstantElasticityDemandModel,
  LogLogisticDemandModel,
  LogisticDemandModel,
  WeibullDemandModel,
}

export { conversion, plotting }
