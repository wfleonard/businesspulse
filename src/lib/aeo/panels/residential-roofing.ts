import type { CannedPanelDefinition } from './index'

/**
 * Residential roofing: asphalt shingle, metal, slate and tile replacement,
 * repair, storm and insurance work. Mostly homeowner buyers, plus HOAs and
 * property managers. Low-slope commercial work is its own panel.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const residentialRoofing: CannedPanelDefinition = {
  slug: 'residential-roofing',
  name: 'Residential roofing',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'roofing contractors near {city}, {state}' },
    { c: 'service-geo', q: 'roof replacement companies in {state}' },
    { c: 'service-geo', q: 'roof repair near {city}' },
    { c: 'service-geo', q: 'emergency roof leak repair near {city}, {state}' },
    { c: 'service-geo', q: 'metal roof installers near {city}' },
    { c: 'service-geo', q: 'best rated roofers in {state}' },
    { c: 'service-geo', q: 'storm damage roofing contractor near {city}' },
    { c: 'service-geo', q: 'slate roof repair specialists in {state}' },
    { c: 'service-geo', q: 'GAF certified roofing contractors near {city}, {state}' },
    { c: 'service-geo', q: 'roof inspection near {city}' },

    { c: 'cost', q: 'how much does a new roof cost' },
    { c: 'cost', q: 'roof replacement cost per square' },
    { c: 'cost', q: 'asphalt shingle roof cost in {state}' },
    { c: 'cost', q: 'metal roof vs shingle roof cost' },
    { c: 'cost', q: 'how much does roof leak repair cost' },
    { c: 'cost', q: 'cost to replace roof decking' },
    { c: 'cost', q: 'how much does a roof inspection cost' },
    { c: 'cost', q: 'cost of a roof tear off vs layover' },
    { c: 'cost', q: 'does homeowners insurance pay for a new roof' },

    { c: 'permits', q: 'do I need a permit to replace my roof in {city}, {state}' },
    { c: 'permits', q: 'roofing contractor license requirements in {state}' },
    { c: 'permits', q: 'how many layers of shingles are allowed by building code' },
    { c: 'permits', q: 'ice and water shield code requirements' },
    { c: 'permits', q: 'HOA rules for changing roof color or material' },
    { c: 'permits', q: 'roof ventilation code requirements for a replacement' },

    { c: 'comparison', q: 'architectural shingles vs 3 tab shingles' },
    { c: 'comparison', q: 'metal roof vs asphalt shingles' },
    { c: 'comparison', q: 'standing seam vs exposed fastener metal roof' },
    { c: 'comparison', q: 'roof repair vs roof replacement' },
    { c: 'comparison', q: 'synthetic slate vs real slate roof' },
    { c: 'comparison', q: 'GAF vs Owens Corning vs CertainTeed shingles' },
    { c: 'comparison', q: 'roof over vs tear off' },

    { c: 'technical', q: 'how long does an asphalt shingle roof last' },
    { c: 'technical', q: 'how long does a roof replacement take' },
    { c: 'technical', q: 'how to tell if my roof needs to be replaced' },
    { c: 'technical', q: 'what is a drip edge and do I need one' },
    { c: 'technical', q: 'what does a roofing warranty cover' },
    { c: 'technical', q: 'manufacturer warranty vs workmanship warranty on a roof' },
    { c: 'technical', q: 'best time of year to replace a roof' },
    { c: 'technical', q: 'can a roof be replaced in the winter' },
    { c: 'technical', q: 'what is roof flashing' },

    { c: 'application', q: 'roof replacement on a historic home' },
    { c: 'application', q: 'roof replacement before installing solar panels' },
    { c: 'application', q: 'low slope roof over a porch or addition' },
    { c: 'application', q: 'skylight replacement during a roof replacement' },
    { c: 'application', q: 'roof replacement before selling a house' },

    { c: 'problem', q: 'roof leaking around the chimney' },
    { c: 'problem', q: 'shingles blown off in a storm' },
    { c: 'problem', q: 'ice dams on my roof' },
    { c: 'problem', q: 'moss or black streaks on roof shingles' },
    { c: 'problem', q: 'sagging roof line' },
    { c: 'problem', q: 'attic mold from poor roof ventilation' },

    { c: 'vendor-selection', q: 'questions to ask a roofing contractor before hiring' },
    { c: 'vendor-selection', q: 'how to avoid storm chaser roofers' },
    { c: 'vendor-selection', q: 'how to compare roofing estimates' },
    { c: 'vendor-selection', q: 'what should be in a roofing contract' },
    { c: 'vendor-selection', q: 'how many roofing quotes should I get' },
    { c: 'vendor-selection', q: 'do roofers need insurance' },
    { c: 'vendor-selection', q: 'what does a certified roofing contractor mean' },

    { c: 'buyer-role', q: 'roofing contractor for an HOA or condo association in {state}' },
    { c: 'buyer-role', q: 'roofer that works with insurance claims near {city}' },
    { c: 'buyer-role', q: 'roofing contractor for rental properties near {city}' },
    { c: 'buyer-role', q: 'roof certification for a home sale in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'birdeye.com', 'consumeraffairs.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, calculators, software and suppliers
    // that answers cite but that don't compete for the job.
    'todayshomeowner.com', 'thespruce.com', 'roofingcalculator.com',
    'contractorlicenserequirements.com', 'nrcia.org', 'ibuyer.com', 'squaredash.com',
    'servicetitan.com', 'roofmaxx.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'iccsafe.org', 'fema.gov', 'energystar.gov', 'energy.gov', 'osha.gov', 'iii.org', 'naic.org',
    'nrca.net', 'roofingcontractor.com', 'roofingcalc.com', 'thisoldhouse.com', 'bobvila.com',
    'familyhandyman.com', 'consumerreports.org', 'forbes.com', 'bankrate.com', 'nerdwallet.com',
    'gaf.com', 'owenscorning.com', 'certainteed.com', 'iko.com', 'malarkeyroofing.com',
    'tamko.com', 'atlasroofing.com', 'davinciroofscapes.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
