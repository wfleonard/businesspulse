import type { PanelQuestion } from '../questions'
import { basementWaterproofing } from './basement-waterproofing'
import { bathroomRemodeling } from './bathroom-remodeling'
import { commercialRoofing } from './commercial-roofing'
import { electricalContracting } from './electrical-contracting'
import { excavationSiteWork } from './excavation-site-work'
import { generalContractors } from './general-contractors'
import { hddTrenchless } from './hdd-trenchless'
import { hvacPlumbing } from './hvac-plumbing'
import { kitchenRemodeling } from './kitchen-remodeling'
import { landscaping } from './landscaping'
import { municipalAdvisors } from './municipal-advisors'
import { poolsHotTubs } from './pools-hot-tubs'
import { residentialRoofing } from './residential-roofing'
import { siding } from './siding'
import { solarInstallers } from './solar-installers'
import { treeServices } from './tree-services'
import { windowsDoors } from './windows-doors'

/**
 * Canned vertical panels, kept in code so they are reviewed and versioned like
 * code. `npm run aeo:panels` writes them to the aeo_panel table.
 */
export type CannedPanelDefinition = {
  slug: string
  /** Shown in the request form's industry dropdown. */
  name: string
  /** Templates; slots are filled per request (see questions.ts and plan.ts). */
  questions: PanelQuestion[]
  /** Third-party listings: being cited only through one of these is "renting" the answer. */
  directoryDomains: string[]
  /** Not competitors: regulators, reference sites, trade press, manufacturers. */
  referenceDomains: string[]
}

export const CANNED_PANELS: CannedPanelDefinition[] = [
  hddTrenchless,
  commercialRoofing,
  electricalContracting,
  hvacPlumbing,
  landscaping,
  municipalAdvisors,
  poolsHotTubs,
  residentialRoofing,
  siding,
  windowsDoors,
  solarInstallers,
  generalContractors,
  kitchenRemodeling,
  bathroomRemodeling,
  basementWaterproofing,
  treeServices,
  excavationSiteWork,
]
