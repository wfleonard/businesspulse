import type { CannedPanelDefinition } from './index'

/**
 * Siding contractors: vinyl, fiber cement, engineered wood, cedar, stone
 * veneer, and repair. Mostly homeowner buyers, plus HOAs and small
 * multifamily owners.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const siding: CannedPanelDefinition = {
  slug: 'siding',
  name: 'Siding',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'siding contractors near {city}, {state}' },
    { c: 'service-geo', q: 'siding replacement companies in {state}' },
    { c: 'service-geo', q: 'James Hardie siding installers near {city}' },
    { c: 'service-geo', q: 'vinyl siding installation near {city}, {state}' },
    { c: 'service-geo', q: 'siding repair near {city}' },
    { c: 'service-geo', q: 'best siding companies in {state}' },
    { c: 'service-geo', q: 'cedar shake siding contractors in {state}' },
    { c: 'service-geo', q: 'stone veneer installers near {city}' },
    { c: 'service-geo', q: 'storm damaged siding repair near {city}, {state}' },

    { c: 'cost', q: 'how much does new siding cost' },
    { c: 'cost', q: 'siding replacement cost per square foot' },
    { c: 'cost', q: 'vinyl siding cost for a two story house' },
    { c: 'cost', q: 'fiber cement siding cost vs vinyl' },
    { c: 'cost', q: 'cost to repair a section of siding' },
    { c: 'cost', q: 'siding cost in {state}' },
    { c: 'cost', q: 'cost to add house wrap and insulation under new siding' },
    { c: 'cost', q: 'does new siding increase home value' },

    { c: 'permits', q: 'do I need a permit to replace siding in {city}, {state}' },
    { c: 'permits', q: 'contractor license requirements for siding work in {state}' },
    { c: 'permits', q: 'lead paint rules for removing old siding on a pre-1978 house' },
    { c: 'permits', q: 'HOA approval for changing siding color or material' },
    { c: 'permits', q: 'historic district rules for replacing siding' },
    { c: 'permits', q: 'building code requirements for siding and house wrap' },

    { c: 'comparison', q: 'vinyl vs fiber cement siding' },
    { c: 'comparison', q: 'James Hardie vs LP SmartSide' },
    { c: 'comparison', q: 'insulated vinyl siding vs regular vinyl siding' },
    { c: 'comparison', q: 'cedar vs fiber cement siding' },
    { c: 'comparison', q: 'board and batten vs lap siding' },
    { c: 'comparison', q: 'replace vs paint old wood siding' },
    { c: 'comparison', q: 'stucco vs siding' },

    { c: 'technical', q: 'how long does vinyl siding last' },
    { c: 'technical', q: 'how long does fiber cement siding last' },
    { c: 'technical', q: 'how long does a siding replacement take' },
    { c: 'technical', q: 'should old siding be removed before installing new siding' },
    { c: 'technical', q: 'what is house wrap and why does it matter' },
    { c: 'technical', q: 'can siding be installed in cold weather' },
    { c: 'technical', q: 'what warranty comes with new siding' },
    { c: 'technical', q: 'how to maintain fiber cement siding' },

    { c: 'application', q: 'matching new siding to an addition' },
    { c: 'application', q: 'siding replacement with window replacement at the same time' },
    { c: 'application', q: 'siding for a coastal home with salt air' },
    { c: 'application', q: 'siding for a historic house' },
    { c: 'application', q: 'siding a detached garage or shed' },

    { c: 'problem', q: 'rotting wood behind siding' },
    { c: 'problem', q: 'vinyl siding warping or buckling' },
    { c: 'problem', q: 'siding cracked by hail' },
    { c: 'problem', q: 'water getting behind siding' },
    { c: 'problem', q: 'woodpecker holes in siding' },
    { c: 'problem', q: 'faded vinyl siding' },

    { c: 'vendor-selection', q: 'questions to ask a siding contractor before hiring' },
    { c: 'vendor-selection', q: 'how to compare siding quotes' },
    { c: 'vendor-selection', q: 'what should a siding estimate include' },
    { c: 'vendor-selection', q: 'certified James Hardie contractor meaning' },
    { c: 'vendor-selection', q: 'red flags when hiring a siding company' },
    { c: 'vendor-selection', q: 'do siding contractors need to be lead safe certified' },

    { c: 'buyer-role', q: 'siding contractor for a condo association in {state}' },
    { c: 'buyer-role', q: 'siding replacement for a multifamily building near {city}' },
    { c: 'buyer-role', q: 'siding contractor that handles insurance claims near {city}' },
    { c: 'buyer-role', q: 'siding repair before selling a house' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'bestpickreports.com', 'birdeye.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, calculators, software and suppliers
    // that answers cite but that don't compete for the job.
    'sidingcosts.com', 'simplywise.com', 'moneypit.com', 'doityourself.com',
    'todayshomeowner.com', 'thespruce.com', 'hover.to', 'procore.com', 'homedepot.com',
    'lowes.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'epa.gov', 'iccsafe.org', 'energy.gov', 'energystar.gov', 'nps.gov',
    'vinylsiding.org', 'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com',
    'consumerreports.org', 'forbes.com', 'bankrate.com', 'remodeling.hw.net',
    'jameshardie.com', 'lpcorp.com', 'certainteed.com', 'alside.com', 'royalbuildingproducts.com',
    'plygem.com', 'mastic.com', 'kaycan.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
