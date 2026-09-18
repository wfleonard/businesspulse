import type { CannedPanelDefinition } from './index'

/**
 * Pool builders, pool service companies, and hot tub dealers. Mostly
 * homeowner buyers, plus HOA and commercial pool work.
 *
 * Written 2026-09-18. Validate against a known business before relying on it.
 */
export const poolsHotTubs: CannedPanelDefinition = {
  slug: 'pools-hot-tubs',
  name: 'Pools & hot tubs',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'pool builders near {city}, {state}' },
    { c: 'service-geo', q: 'inground pool installation companies in {state}' },
    { c: 'service-geo', q: 'pool service companies near {city}' },
    { c: 'service-geo', q: 'weekly pool cleaning service near {city}, {state}' },
    { c: 'service-geo', q: 'pool opening and closing service near {city}' },
    { c: 'service-geo', q: 'hot tub dealers near {city}, {state}' },
    { c: 'service-geo', q: 'pool repair company near {city}' },
    { c: 'service-geo', q: 'best pool contractors in {state}' },
    { c: 'service-geo', q: 'fiberglass pool installers in {state}' },
    { c: 'service-geo', q: 'pool liner replacement near {city}, {state}' },
    { c: 'service-geo', q: 'who installs pool heaters near {city}' },

    { c: 'cost', q: 'how much does an inground pool cost in {state}' },
    { c: 'cost', q: 'fiberglass vs gunite pool cost' },
    { c: 'cost', q: 'cost to replace a vinyl pool liner' },
    { c: 'cost', q: 'how much does weekly pool service cost' },
    { c: 'cost', q: 'cost to open and close a pool each year' },
    { c: 'cost', q: 'how much does a hot tub cost to buy and install' },
    { c: 'cost', q: 'hot tub electrical installation cost' },
    { c: 'cost', q: 'monthly cost to run a hot tub' },
    { c: 'cost', q: 'cost to resurface a gunite pool' },
    { c: 'cost', q: 'how much does a pool heat pump cost' },

    { c: 'permits', q: 'do I need a permit to install an inground pool in {city}, {state}' },
    { c: 'permits', q: 'pool fence requirements in {state}' },
    { c: 'permits', q: 'pool barrier code requirements for residential pools' },
    { c: 'permits', q: 'do you need a permit for an above ground pool in {state}' },
    { c: 'permits', q: 'hot tub permit requirements in {city}, {state}' },
    { c: 'permits', q: 'how close can a pool be to a property line in {state}' },
    { c: 'permits', q: 'electrical inspection requirements for a new pool' },

    { c: 'comparison', q: 'fiberglass vs vinyl vs concrete pool which is best' },
    { c: 'comparison', q: 'saltwater vs chlorine pool pros and cons' },
    { c: 'comparison', q: 'heat pump vs gas pool heater' },
    { c: 'comparison', q: 'hot tub vs swim spa' },
    { c: 'comparison', q: 'inground vs above ground pool for resale value' },
    { c: 'comparison', q: 'variable speed pool pump vs single speed' },
    { c: 'comparison', q: 'plug and play hot tub vs 240 volt hot tub' },

    { c: 'technical', q: 'how often should a pool filter be cleaned' },
    { c: 'technical', q: 'what chlorine level should a pool have' },
    { c: 'technical', q: 'why is my pool water cloudy' },
    { c: 'technical', q: 'how to get rid of green algae in a pool' },
    { c: 'technical', q: 'how long does it take to build an inground pool' },
    { c: 'technical', q: 'how long does a vinyl pool liner last' },
    { c: 'technical', q: 'how often should hot tub water be changed' },
    { c: 'technical', q: 'what size pool pump do I need' },
    { c: 'technical', q: 'how to winterize an inground pool' },
    { c: 'technical', q: 'best time of year to install a pool' },

    { c: 'application', q: 'adding a hot tub to an existing deck' },
    { c: 'application', q: 'installing a pool on a sloped backyard' },
    { c: 'application', q: 'adding an automatic safety cover to a pool' },
    { c: 'application', q: 'converting a chlorine pool to saltwater' },
    { c: 'application', q: 'adding LED lighting to an existing pool' },
    { c: 'application', q: 'remodeling an older gunite pool' },

    { c: 'vendor-selection', q: 'how to choose a pool builder' },
    { c: 'vendor-selection', q: 'questions to ask a pool contractor before signing' },
    { c: 'vendor-selection', q: 'what warranty should a new pool come with' },
    { c: 'vendor-selection', q: 'how to check if a pool contractor is licensed in {state}' },
    { c: 'vendor-selection', q: 'what certifications should a pool service technician have' },
    { c: 'vendor-selection', q: 'red flags when hiring a pool company' },
    { c: 'vendor-selection', q: 'how far in advance should I book a pool installation' },

    { c: 'problem', q: 'pool is losing water how to find a leak' },
    { c: 'problem', q: 'pool pump running but not moving water' },
    { c: 'problem', q: 'hot tub not heating what to check' },
    { c: 'problem', q: 'pool heater not turning on' },
    { c: 'problem', q: 'cracks in a concrete pool deck repair' },
    { c: 'problem', q: 'pool liner wrinkles how to fix' },
    { c: 'problem', q: 'who repairs hot tubs near {city}' },

    { c: 'buyer-role', q: 'pool service company for an HOA or community pool in {state}' },
    { c: 'buyer-role', q: 'commercial pool maintenance for apartment complexes near {city}' },
    { c: 'buyer-role', q: 'hotel pool service companies in {state}' },
    { c: 'buyer-role', q: 'swim club pool management companies near {city}' },
  ],

  directoryDomains: [
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'facebook.com', 'instagram.com', 'linkedin.com',
    'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'cpsc.gov', 'poolsafely.gov', 'cdc.gov', 'energystar.gov', 'iccsafe.org',
    'phta.org', 'poolspanews.com', 'aquamagazine.com', 'swimuniversity.com', 'troublefreepool.com',
    'hayward.com', 'pentair.com', 'jandy.com', 'fluidra.com', 'lathampool.com',
    'hotspring.com', 'jacuzzi.com', 'sundancespas.com', 'calspas.com', 'bullfrogspas.com',
    'thisoldhouse.com', 'bobvila.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
