import type { CannedPanelDefinition } from './index'

/**
 * Bathroom remodelers: full bathroom renovations, tub-to-shower conversions,
 * tile and vanities, and accessible bathrooms. Mostly homeowner buyers, plus
 * landlords and older homeowners planning to age in place.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const bathroomRemodeling: CannedPanelDefinition = {
  slug: 'bathroom-remodeling',
  name: 'Bathroom remodeling',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'bathroom remodeling contractors near {city}, {state}' },
    { c: 'service-geo', q: 'best bathroom remodelers in {state}' },
    { c: 'service-geo', q: 'tub to shower conversion near {city}' },
    { c: 'service-geo', q: 'walk in shower installers near {city}, {state}' },
    { c: 'service-geo', q: 'accessible bathroom remodeling near {city}' },
    { c: 'service-geo', q: 'tile installers for bathrooms near {city}' },
    { c: 'service-geo', q: 'one day bath replacement near {city}, {state}' },
    { c: 'service-geo', q: 'master bathroom renovation contractors in {state}' },
    { c: 'service-geo', q: 'small bathroom remodel near {city}' },

    { c: 'cost', q: 'how much does a bathroom remodel cost' },
    { c: 'cost', q: 'bathroom remodel cost in {state}' },
    { c: 'cost', q: 'cost of a small bathroom remodel' },
    { c: 'cost', q: 'tub to shower conversion cost' },
    { c: 'cost', q: 'walk in shower cost' },
    { c: 'cost', q: 'acrylic bath liner vs tile shower cost' },
    { c: 'cost', q: 'cost to add a bathroom to a house' },
    { c: 'cost', q: 'does a bathroom remodel add value to a home' },
    { c: 'cost', q: 'grants or financing for an accessible bathroom' },

    { c: 'permits', q: 'do I need a permit for a bathroom remodel in {city}, {state}' },
    { c: 'permits', q: 'home improvement contractor license requirements in {state}' },
    { c: 'permits', q: 'bathroom exhaust fan code requirements' },
    { c: 'permits', q: 'GFCI outlet requirements in a bathroom' },
    { c: 'permits', q: 'ADA bathroom requirements for a home' },
    { c: 'permits', q: 'shower glass and tempered glass code requirements' },

    { c: 'comparison', q: 'tile shower vs acrylic shower' },
    { c: 'comparison', q: 'walk in tub vs walk in shower' },
    { c: 'comparison', q: 'Bath Fitter vs a local bathroom remodeler' },
    { c: 'comparison', q: 'curbless shower vs shower with a curb' },
    { c: 'comparison', q: 'porcelain vs ceramic tile for a bathroom' },
    { c: 'comparison', q: 'freestanding vs built in bathtub' },
    { c: 'comparison', q: 'full remodel vs bathroom refresh' },

    { c: 'technical', q: 'how long does a bathroom remodel take' },
    { c: 'technical', q: 'bathroom remodel steps in order' },
    { c: 'technical', q: 'what is a shower pan and waterproofing membrane' },
    { c: 'technical', q: 'how to prevent mold in a new bathroom' },
    { c: 'technical', q: 'how long does a tile shower last' },
    { c: 'technical', q: 'what size exhaust fan does my bathroom need' },
    { c: 'technical', q: 'can a bathroom be remodeled while living in the house' },
    { c: 'technical', q: 'heated bathroom floor options' },

    { c: 'application', q: 'bathroom remodel for aging in place' },
    { c: 'application', q: 'converting a tub to a shower for a senior' },
    { c: 'application', q: 'adding a bathroom in a basement' },
    { c: 'application', q: 'bathroom remodel in an older house with old plumbing' },
    { c: 'application', q: 'bathroom remodel in a condo' },

    { c: 'problem', q: 'leaking shower damaging the ceiling below' },
    { c: 'problem', q: 'mold behind bathroom tile' },
    { c: 'problem', q: 'cracked or loose bathroom tiles' },
    { c: 'problem', q: 'soft spot in the bathroom floor' },
    { c: 'problem', q: 'bathroom too small for a walk in shower' },
    { c: 'problem', q: 'grout keeps cracking in the shower' },

    { c: 'vendor-selection', q: 'questions to ask a bathroom remodeler before hiring' },
    { c: 'vendor-selection', q: 'how to compare bathroom remodel quotes' },
    { c: 'vendor-selection', q: 'what is a certified aging in place specialist' },
    { c: 'vendor-selection', q: 'what should a bathroom remodel contract include' },
    { c: 'vendor-selection', q: 'red flags when hiring a bathroom contractor' },
    { c: 'vendor-selection', q: 'are in home bath sales appointments high pressure' },

    { c: 'buyer-role', q: 'bathroom remodel for a rental property near {city}' },
    { c: 'buyer-role', q: 'accessible bathroom for a veteran or wheelchair user in {state}' },
    { c: 'buyer-role', q: 'bathroom remodel before selling a house' },
    { c: 'buyer-role', q: 'commercial restroom renovation contractor near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: review and lead sites.
    'bestcompany.com', 'blockrenovation.com',
    'yelp.com', 'bbb.org', 'angi.com', 'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'houzz.com', 'yellowpages.com', 'nextdoor.com', 'porch.com', 'bark.com', 'networx.com',
    'buildzoom.com', 'homeguide.com', 'fixr.com', 'modernize.com', 'sweeten.com', 'birdeye.com',
    'bestpickreports.com', 'consumeraffairs.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, cost and code sites, insurers and
    // suppliers that answers cite but that don't compete for the job.
    'homesandgardens.com', 'latestcost.com', 'realmhome.com', 'up.codes', 'usacabinetstore.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'iccsafe.org', 'ada.gov', 'access-board.gov', 'va.gov', 'epa.gov', 'energystar.gov',
    'nkba.org', 'nari.org', 'nahb.org', 'aarp.org', 'tcnatile.com',
    'remodeling.hw.net', 'thisoldhouse.com', 'bobvila.com', 'familyhandyman.com', 'thespruce.com',
    'bhg.com', 'hgtv.com', 'todayshomeowner.com', 'consumerreports.org', 'forbes.com',
    'bankrate.com', 'nerdwallet.com', 'homedepot.com', 'lowes.com',
    'kohler.com', 'moen.com', 'americanstandard-us.com', 'toto.com', 'deltafaucet.com',
    'schluter.com', 'daltile.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
