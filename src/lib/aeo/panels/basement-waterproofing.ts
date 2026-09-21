import type { CannedPanelDefinition } from './index'

/**
 * Basement waterproofing: interior and exterior waterproofing, sump pumps,
 * foundation crack repair, crawl space encapsulation, and yard drainage tied
 * to a wet basement. Mostly homeowner buyers, plus buyers and sellers mid
 * home inspection and small commercial owners.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const basementWaterproofing: CannedPanelDefinition = {
  slug: 'basement-waterproofing',
  name: 'Basement waterproofing',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'basement waterproofing companies near {city}, {state}' },
    { c: 'service-geo', q: 'best basement waterproofing contractors in {state}' },
    { c: 'service-geo', q: 'sump pump installation near {city}' },
    { c: 'service-geo', q: 'foundation crack repair near {city}, {state}' },
    { c: 'service-geo', q: 'crawl space encapsulation contractors near {city}' },
    { c: 'service-geo', q: 'wet basement repair near {city}' },
    { c: 'service-geo', q: 'exterior foundation waterproofing contractors in {state}' },
    { c: 'service-geo', q: 'emergency flooded basement help near {city}, {state}' },
    { c: 'service-geo', q: 'French drain installers near {city}' },

    { c: 'cost', q: 'how much does basement waterproofing cost' },
    { c: 'cost', q: 'basement waterproofing cost per linear foot' },
    { c: 'cost', q: 'interior vs exterior waterproofing cost' },
    { c: 'cost', q: 'sump pump installation cost' },
    { c: 'cost', q: 'foundation crack repair cost' },
    { c: 'cost', q: 'crawl space encapsulation cost' },
    { c: 'cost', q: 'basement waterproofing cost in {state}' },
    { c: 'cost', q: 'does homeowners insurance cover a wet basement' },

    { c: 'permits', q: 'do I need a permit for basement waterproofing in {city}, {state}' },
    { c: 'permits', q: 'can a sump pump discharge into the sewer or the street' },
    { c: 'permits', q: 'home improvement contractor license requirements in {state}' },
    { c: 'permits', q: 'disclosing basement water problems when selling a house in {state}' },
    { c: 'permits', q: 'radon testing and mitigation during basement waterproofing' },
    { c: 'permits', q: 'building code requirements for basement drainage' },

    { c: 'comparison', q: 'interior drain tile vs exterior waterproofing' },
    { c: 'comparison', q: 'waterproofing paint vs a drainage system' },
    { c: 'comparison', q: 'pedestal vs submersible sump pump' },
    { c: 'comparison', q: 'battery backup vs water powered backup sump pump' },
    { c: 'comparison', q: 'crawl space encapsulation vs vapor barrier only' },
    { c: 'comparison', q: 'epoxy vs polyurethane crack injection' },
    { c: 'comparison', q: 'dehumidifier vs waterproofing for a damp basement' },

    { c: 'technical', q: 'why does my basement leak when it rains' },
    { c: 'technical', q: 'what is hydrostatic pressure in a basement' },
    { c: 'technical', q: 'how long does basement waterproofing take' },
    { c: 'technical', q: 'how long does a sump pump last' },
    { c: 'technical', q: 'what is efflorescence on basement walls' },
    { c: 'technical', q: 'is a basement waterproofing warranty transferable' },
    { c: 'technical', q: 'how do I know if foundation cracks are serious' },
    { c: 'technical', q: 'what humidity level should a basement have' },

    { c: 'application', q: 'waterproofing before finishing a basement' },
    { c: 'application', q: 'wet basement in an older stone foundation house' },
    { c: 'application', q: 'waterproofing a basement with a finished wall already in place' },
    { c: 'application', q: 'basement water problem found in a home inspection' },
    { c: 'application', q: 'crawl space moisture in a house with no basement' },

    { c: 'problem', q: 'water coming up through the basement floor' },
    { c: 'problem', q: 'water leaking where the wall meets the floor' },
    { c: 'problem', q: 'musty smell and mold in the basement' },
    { c: 'problem', q: 'sump pump running constantly' },
    { c: 'problem', q: 'bowing or cracked basement wall' },
    { c: 'problem', q: 'basement flooded during a storm' },

    { c: 'vendor-selection', q: 'questions to ask a basement waterproofing company' },
    { c: 'vendor-selection', q: 'how to compare basement waterproofing quotes' },
    { c: 'vendor-selection', q: 'basement waterproofing scams and upsells to avoid' },
    { c: 'vendor-selection', q: 'what should a basement waterproofing warranty cover' },
    { c: 'vendor-selection', q: 'structural engineer vs waterproofing contractor for foundation cracks' },
    { c: 'vendor-selection', q: 'how many waterproofing estimates should I get' },

    { c: 'buyer-role', q: 'basement waterproofing for a house I am buying in {state}' },
    { c: 'buyer-role', q: 'basement waterproofing for a rental property near {city}' },
    { c: 'buyer-role', q: 'commercial basement or below grade waterproofing contractor near {city}' },
    { c: 'buyer-role', q: 'waterproofing contractor for a condo association in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'justdial.com', 'basementlocal.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'birdeye.com',
    'bestpickreports.com', 'consumeraffairs.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, cost and code sites, insurers and
    // suppliers that answers cite but that don't compete for the job.
    'thebasement.guide', 'drybasementhub.com', 'dryhomeguide.com', 'ihatemywetbasement.com',
    'statefarm.com', 'amfam.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'epa.gov', 'fema.gov', 'floodsmart.gov', 'iccsafe.org', 'energy.gov', 'iii.org', 'ashi.org',
    'internachi.org', 'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'thespruce.com',
    'todayshomeowner.com', 'moneypit.com', 'consumerreports.org', 'forbes.com', 'bankrate.com',
    'homedepot.com', 'lowes.com',
    'zoeller.com', 'libertypumps.com', 'waynepumps.com', 'basementwatchdog.com', 'drylok.com',
    'xypex.com', 'santafe-products.com', 'aprilaire.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
