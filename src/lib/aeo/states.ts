/**
 * US states and DC, for filling question slots: {state} gets the full name and
 * {state_permit_agency} the agency a buyer would name when asking about road
 * and right-of-way permits.
 *
 * Agencies are named specifically where buyers use a well-known short form;
 * elsewhere the generic "<State> Department of Transportation" is accurate
 * enough to read naturally in a question.
 */

export type StateInfo = { code: string; name: string; permitAgency: string }

const NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

const PERMIT_AGENCIES: Record<string, string> = {
  NJ: 'NJDOT',
  NY: 'NYSDOT',
  PA: 'PennDOT',
  DE: 'DelDOT',
  MD: 'MDOT SHA',
  DC: 'DDOT',
}

export function stateInfo(code: string): StateInfo | undefined {
  const key = code.trim().toUpperCase()
  const name = NAMES[key]
  if (!name) return undefined
  return {
    code: key,
    name,
    permitAgency: PERMIT_AGENCIES[key] ?? `${name} Department of Transportation`,
  }
}

/** Every accepted state code. */
export const STATE_CODES: readonly string[] = Object.keys(NAMES)

/** States sorted by name, for the request form. */
export function stateOptions(): { code: string; name: string }[] {
  return STATE_CODES.map((code) => ({ code, name: NAMES[code] })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
