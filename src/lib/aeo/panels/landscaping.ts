import type { CannedPanelDefinition } from './index'

/**
 * Landscapers, lawn care, hardscaping, and irrigation. Homeowner buyers plus
 * commercial, HOA, and property-management grounds work.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const landscaping: CannedPanelDefinition = {
  slug: 'landscaping',
  name: 'Landscaping & lawn care',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'landscaping companies near {city}, {state}' },
    { c: 'service-geo', q: 'lawn care service near {city}' },
    { c: 'service-geo', q: 'landscape design companies in {state}' },
    { c: 'service-geo', q: 'hardscaping contractors near {city}, {state}' },
    { c: 'service-geo', q: 'paver patio installers near {city}' },
    { c: 'service-geo', q: 'tree removal service near {city}, {state}' },
    { c: 'service-geo', q: 'commercial landscaping companies in {state}' },
    { c: 'service-geo', q: 'snow removal and landscaping companies near {city}' },
    { c: 'service-geo', q: 'irrigation system installers near {city}, {state}' },
    { c: 'service-geo', q: 'best landscapers in {state}' },
    { c: 'service-geo', q: 'retaining wall contractors near {city}' },

    { c: 'cost', q: 'how much does landscaping cost for a new home' },
    { c: 'cost', q: 'lawn mowing service cost per month in {state}' },
    { c: 'cost', q: 'paver patio cost per square foot' },
    { c: 'cost', q: 'cost to install a sprinkler system in {state}' },
    { c: 'cost', q: 'how much does a retaining wall cost' },
    { c: 'cost', q: 'how much does a landscape designer charge' },
    { c: 'cost', q: 'cost of sod vs seed for a new lawn' },
    { c: 'cost', q: 'how much does tree removal cost' },
    { c: 'cost', q: 'how much does a commercial landscaping contract cost' },
    { c: 'cost', q: 'yearly lawn fertilization program cost' },

    { c: 'permits', q: 'do I need a permit to build a retaining wall in {state}' },
    { c: 'permits', q: 'permit for tree removal in {city}, {state}' },
    { c: 'permits', q: 'landscaping contractor license requirements in {state}' },
    { c: 'permits', q: 'pesticide applicator license requirements in {state}' },
    { c: 'permits', q: 'calling 811 before digging for landscaping in {state}' },
    { c: 'permits', q: 'HOA approval rules for landscaping changes' },

    { c: 'comparison', q: 'pavers vs stamped concrete patio' },
    { c: 'comparison', q: 'sod vs hydroseeding' },
    { c: 'comparison', q: 'mulch vs rock landscaping' },
    { c: 'comparison', q: 'organic vs synthetic lawn fertilizer' },
    { c: 'comparison', q: 'drip irrigation vs sprinklers' },
    { c: 'comparison', q: 'artificial turf vs natural grass cost and upkeep' },

    { c: 'technical', q: 'best grass seed for {state}' },
    { c: 'technical', q: 'when to aerate and overseed a lawn in {state}' },
    { c: 'technical', q: 'how often should a lawn be fertilized' },
    { c: 'technical', q: 'how to fix drainage problems in a yard' },
    { c: 'technical', q: 'best native plants for landscaping in {state}' },
    { c: 'technical', q: 'when is the best time to plant trees' },
    { c: 'technical', q: 'how deep should a paver base be' },
    { c: 'technical', q: 'how long does a landscaping project take' },

    { c: 'application', q: 'landscaping ideas for a small backyard' },
    { c: 'application', q: 'low maintenance front yard landscaping' },
    { c: 'application', q: 'outdoor lighting installation for a backyard' },
    { c: 'application', q: 'building an outdoor kitchen and patio' },
    { c: 'application', q: 'landscaping around a new pool' },
    { c: 'application', q: 'fixing a sloped backyard with terraces' },

    { c: 'vendor-selection', q: 'how to choose a landscaping company' },
    { c: 'vendor-selection', q: 'questions to ask a landscaper before hiring' },
    { c: 'vendor-selection', q: 'what insurance should a landscaping company have' },
    { c: 'vendor-selection', q: 'how to compare landscaping quotes' },
    { c: 'vendor-selection', q: 'landscape architect vs landscape designer which do I need' },
    { c: 'vendor-selection', q: 'red flags when hiring a hardscape contractor' },

    { c: 'problem', q: 'brown patches in lawn what causes them' },
    { c: 'problem', q: 'yard floods after rain how to fix' },
    { c: 'problem', q: 'paver patio sinking repair' },
    { c: 'problem', q: 'grubs in lawn treatment' },
    { c: 'problem', q: 'retaining wall leaning what to do' },
    { c: 'problem', q: 'lawn full of weeds how to fix' },

    { c: 'buyer-role', q: 'commercial landscape maintenance for office parks in {state}' },
    { c: 'buyer-role', q: 'HOA landscaping contractors near {city}' },
    { c: 'buyer-role', q: 'property management landscaping companies in {state}' },
    { c: 'buyer-role', q: 'landscaping contractors for apartment complexes near {city}' },
    { c: 'buyer-role', q: 'municipal grounds maintenance contractors in {state}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'homeguide.com', 'fixr.com', 'lawnstarter.com', 'lawnlove.com', 'yourgreenpal.com',
    'taskrabbit.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com',
    'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'epa.gov', 'usda.gov', 'extension.org', 'rutgers.edu', 'psu.edu', 'umd.edu', 'cornell.edu',
    'landscapeprofessionals.org', 'lawnandlandscape.com', 'landscapemanagement.net',
    'totallandscapecare.com', 'arborday.org', 'isa-arbor.com',
    'toro.com', 'deere.com', 'stihlusa.com', 'rainbird.com', 'hunterindustries.com', 'scotts.com',
    'thisoldhouse.com', 'bhg.com', 'thespruce.com',
  ],
}
