import type { PanelQuestion } from '../questions'
import { commercialRoofing } from './commercial-roofing'
import { electricalContracting } from './electrical-contracting'
import { hddTrenchless } from './hdd-trenchless'
import { hvacPlumbing } from './hvac-plumbing'
import { landscaping } from './landscaping'
import { municipalAdvisors } from './municipal-advisors'
import { poolsHotTubs } from './pools-hot-tubs'

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
]
