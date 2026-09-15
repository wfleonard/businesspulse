import type { CannedPanelDefinition } from './index'

/**
 * Horizontal directional drilling and trenchless utility installation.
 *
 * Converted on 2026-09-15 from the eastcoastutility.com audit panel (116
 * questions, SaxonAEO/visibility-panel/clients/eastcoastutility.json):
 *   - places became {city} and {state}; multi-state variants of one question
 *     collapsed into a single template
 *   - NJDOT, PennDOT, DelDOT and Maryland SHA became {state_permit_agency}
 *   - New Jersey programs (NJDEP, NJ One Call, NJ Turnpike) became their
 *     generic equivalents
 *   - questions naming one client's customers (PSE&G, NJ Natural Gas, American
 *     Water) or equipment (Ditch Witch JT20) were generalized or dropped
 *   - "2026" was removed so questions don't go stale
 * Directory and reference lists carry over unchanged.
 */
export const hddTrenchless: CannedPanelDefinition = {
  slug: 'hdd-trenchless',
  name: 'Directional drilling & trenchless utilities',

  questions: [
    { c: 'service-geo', q: '{service} contractor in {state}' },
    { c: 'service-geo', q: 'directional boring companies near {city}, {state}' },
    { c: 'service-geo', q: 'trenchless pipe installation contractor in {state}' },
    { c: 'service-geo', q: 'HDD contractor near {city}, {state}' },
    { c: 'service-geo', q: 'underground utility installation contractor in {state}' },
    { c: 'service-geo', q: 'who does horizontal directional drilling near {city}' },
    { c: 'service-geo', q: 'best directional drilling contractors in {state}' },
    { c: 'service-geo', q: 'fiber optic conduit installation contractor in {state}' },
    { c: 'service-geo', q: 'trenchless gas main installation contractor in {state}' },
    { c: 'service-geo', q: 'water main directional drilling contractor in {state}' },
    { c: 'service-geo', q: 'sewer line boring contractor near {city}' },
    { c: 'service-geo', q: 'telecom conduit boring contractor near {city}, {state}' },
    { c: 'service-geo', q: 'utility contractor that can bore under a road in {state}' },
    { c: 'service-geo', q: 'directional drilling subcontractor for utility companies in {state}' },

    { c: 'cost', q: 'how much does horizontal directional drilling cost per foot' },
    { c: 'cost', q: 'directional boring cost per foot in {state}' },
    { c: 'cost', q: 'cost to bore under a road for a utility line' },
    { c: 'cost', q: 'cost to bore under a driveway for a water line' },
    { c: 'cost', q: 'HDD vs open cut trenching cost comparison' },
    { c: 'cost', q: 'what factors affect horizontal directional drilling pricing' },
    { c: 'cost', q: 'average cost of trenchless utility installation in {state}' },
    { c: 'cost', q: 'how much does it cost to bore under a river' },
    { c: 'cost', q: 'directional drilling mobilization cost' },
    { c: 'cost', q: 'is directional boring cheaper than digging a trench' },
    { c: 'cost', q: 'cost per foot to install fiber conduit underground' },
    { c: 'cost', q: 'how to estimate a horizontal directional drilling job' },

    { c: 'comparison', q: 'HDD vs open cut trenching which is better' },
    { c: 'comparison', q: 'directional boring vs auger boring' },
    { c: 'comparison', q: 'trenchless technology vs traditional excavation' },
    { c: 'comparison', q: 'when should you use horizontal directional drilling instead of trenching' },
    { c: 'comparison', q: 'pipe bursting vs directional drilling' },
    { c: 'comparison', q: 'microtunneling vs horizontal directional drilling' },
    { c: 'comparison', q: 'jack and bore vs directional drilling' },
    { c: 'comparison', q: 'advantages and disadvantages of horizontal directional drilling' },
    { c: 'comparison', q: 'vacuum excavation vs hand digging for utility potholing' },

    { c: 'technical', q: 'what is the maximum length for horizontal directional drilling' },
    { c: 'technical', q: 'how deep can directional boring go' },
    { c: 'technical', q: 'what is a pilot hole in directional drilling' },
    { c: 'technical', q: 'what is reaming in horizontal directional drilling' },
    { c: 'technical', q: 'typical bore diameter range for HDD' },
    { c: 'technical', q: 'what soil conditions are bad for directional drilling' },
    { c: 'technical', q: 'can you directional drill through rock' },
    { c: 'technical', q: 'what drilling fluid is used in horizontal directional drilling' },
    { c: 'technical', q: 'what is a frac-out in directional drilling' },
    { c: 'technical', q: 'how to prevent inadvertent returns during HDD' },
    { c: 'technical', q: 'minimum depth of cover for a gas line under a road' },
    { c: 'technical', q: 'minimum separation between utilities in a bore' },
    { c: 'technical', q: 'what is bentonite used for in directional drilling' },
    { c: 'technical', q: 'how does a directional drill steering head work' },
    { c: 'technical', q: 'directional drill pullback capacity for a utility bore' },
    { c: 'technical', q: 'how accurate is directional boring tracking' },
    { c: 'technical', q: 'what is the minimum bend radius for HDPE in a bore' },
    { c: 'technical', q: 'how long does a directional bore take to complete' },

    { c: 'permits', q: '{state_permit_agency} road opening permit for utility work' },
    { c: 'permits', q: 'how to get a permit to bore under a state road in {state}' },
    { c: 'permits', q: '{state_permit_agency} utility accommodation permit requirements' },
    { c: 'permits', q: '{state_permit_agency} highway occupancy permit for directional drilling' },
    { c: 'permits', q: 'wetlands permit for a utility crossing in {state}' },
    { c: 'permits', q: 'railroad crossing permit for a utility line in {state}' },
    { c: 'permits', q: '811 markout requirements before drilling in {state}' },
    { c: 'permits', q: 'how long does a {state_permit_agency} utility permit take to approve' },
    { c: 'permits', q: 'do you need a permit to bore under a municipal road in {state}' },
    { c: 'permits', q: 'stream encroachment permit for a utility crossing in {state}' },
    { c: 'permits', q: 'toll road utility crossing requirements in {state}' },

    { c: 'application', q: 'how to install fiber optic cable under a highway' },
    { c: 'application', q: 'installing a gas line under a river without digging' },
    { c: 'application', q: 'run utility line under driveway without digging it up' },
    { c: 'application', q: 'how to run conduit under a parking lot' },
    { c: 'application', q: 'installing water service under an existing road' },
    { c: 'application', q: 'traffic signal conduit installation contractor in {state}' },
    { c: 'application', q: 'boring under railroad tracks for a utility line' },
    { c: 'application', q: 'directional drilling under wetlands environmental requirements' },
    { c: 'application', q: 'how to install electric service under a paved area' },
    { c: 'application', q: 'fiber installation on a military base contractor requirements' },
    { c: 'application', q: 'installing conduit for surveillance cameras across a campus' },
    { c: 'application', q: 'sewer lateral replacement without excavation' },
    { c: 'application', q: 'how to cross a creek with a water main' },
    { c: 'application', q: 'trenchless installation under mature trees' },

    { c: 'vendor-selection', q: 'how to choose a horizontal directional drilling contractor' },
    { c: 'vendor-selection', q: 'questions to ask a directional drilling contractor before hiring' },
    { c: 'vendor-selection', q: 'what insurance should a directional drilling contractor carry' },
    { c: 'vendor-selection', q: 'are directional drilling contractors licensed in {state}' },
    { c: 'vendor-selection', q: 'how to find a prequalified {state_permit_agency} utility contractor' },
    { c: 'vendor-selection', q: 'what certifications should an HDD crew have' },
    { c: 'vendor-selection', q: 'how to vet a utility subcontractor for a gas utility project' },
    { c: 'vendor-selection', q: 'minority or small business utility contractors in {state}' },
    { c: 'vendor-selection', q: 'directional drilling contractor experience requirements for utility work' },

    { c: 'problem', q: 'what happens if a directional bore hits an existing utility' },
    { c: 'problem', q: 'what to do if a bore goes off course' },
    { c: 'problem', q: 'frac out cleanup requirements directional drilling' },
    { c: 'problem', q: 'ground settlement after directional boring' },
    { c: 'problem', q: 'who is liable if a bore damages a gas line' },
    { c: 'problem', q: 'directional bore stuck pipe what to do' },
    { c: 'problem', q: 'how to repair a damaged conduit after installation' },
    { c: 'problem', q: 'common causes of directional drilling failures' },

    { c: 'buyer-role', q: 'utility contractor for a gas distribution main replacement program' },
    { c: 'buyer-role', q: 'contractor for water utility service line replacement in {state}' },
    { c: 'buyer-role', q: 'who installs conduit for municipal street lighting projects' },
    { c: 'buyer-role', q: 'telecom contractor for a last mile fiber build in {state}' },
    { c: 'buyer-role', q: 'engineering firm needs a directional drilling subcontractor in {state}' },
    { c: 'buyer-role', q: 'general contractor looking for a trenchless utility sub in {state}' },
    { c: 'buyer-role', q: 'lead service line replacement contractor in {state}' },
    { c: 'buyer-role', q: 'approved installation contractors for gas utilities in {state}' },
    { c: 'buyer-role', q: 'approved contractors for water utility work in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'thumbtack.com', 'bbb.org', 'yellowpages.com', 'mapquest.com',
    'angi.com', 'angieslist.com', 'houzz.com', 'manta.com', 'buildzoom.com',
    'porch.com', 'birdeye.com', 'chamberofcommerce.com', 'dandb.com',
    'zoominfo.com', 'linkedin.com', 'facebook.com', 'instagram.com',
    'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'crunchbase.com',
    'bizapedia.com', 'opencorporates.com', 'yellowbook.com', 'superpages.com',
    'citysquares.com', 'cylex.us.com', 'hotfrog.com', 'merchantcircle.com',
    'homeguide.com', 'thebluebook.com', 'constructionjournal.com',
    'procore.com', 'bidclerk.com', 'dodgeconstruction.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',

    'epa.gov', 'osha.gov', 'dot.gov', 'nj.gov', 'pa.gov', 'delaware.gov',
    'maryland.gov', 'ny.gov', 'penndot.pa.gov', 'state.nj.us',
    'uspto.gov', 'govinfo.gov', 'ecfr.gov', 'federalregister.gov',

    'law.cornell.edu', 'justia.com', 'casetext.com', 'findlaw.com',

    'sciencedirect.com', 'researchgate.net', 'academia.edu', 'springer.com',
    'asce.org', 'nap.edu', 'scribd.com', 'studylib.net', 'dokumen.pub',

    'trenchlesstechnology.com', 'trenchlesspedia.com', 'trenchless-australasia.com',
    'undergroundinfrastructure.com', 'constructionequipment.com',
    'equipmentworld.com', 'forconstructionpros.com', 'pipelineandgasjournal.com',

    'ditchwitch.com', 'vermeer.com', 'americanaugers.com', 'tracto.com',
    'wolfmachinerysupply.com', 'baroididp.com', 'cetco.com',

    'eng-tips.com', 'mikeholt.com', 'contractortalk.com', 'plbg.com',
    'excavatinginsurancepartners.com', 'nassco.org', 'nulca.org', 'dcaweb.org',
  ],
}
