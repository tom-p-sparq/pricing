export { costSlider } from './cost.js';
export { poissonLooksSlider, fixedLooksSlider } from './looks.js';
export { riskAversionSlider } from './riskAversion.js';
export { referenceForm } from './reference.js';
export { interpolantsForm } from './interpolants.js';
export { priorForm, interpolantsPriorForm } from './prior.js';
import {
    getData,
    clearData,
    setData,
    fittingDataInput,
    fittingDataTable,
    scenarioButton
} from './fitting.js';

export const fittingData = {
    get: getData,
    clear: clearData,
    set: setData,
    input: fittingDataInput,
    table: fittingDataTable,
    scenario: scenarioButton,
};
