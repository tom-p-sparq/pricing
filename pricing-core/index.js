import { LinearDemandModel } from './conversion/Linear'
import { ConstantElasticityDemandModel } from './conversion/ConstantElasticity'
import { LogLogisticDemandModel } from './conversion/LogLogistic'
import { LogisticDemandModel } from './conversion/Logistic'
import { WeibullDemandModel } from './conversion/Weibull'

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

export { conversion }
