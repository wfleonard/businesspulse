import type { CannedPanelDefinition } from './index'

/**
 * Marinas and marine repair: slips and moorings, winter storage, haul-outs,
 * engine and outboard service, fiberglass and bottom work, and mobile marine
 * mechanics. Buyers are boat owners, plus buyers mid-purchase, yacht clubs,
 * and boat dealers.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const marineServices: CannedPanelDefinition = {
  slug: 'marine-services',
  name: 'Marinas & marine repair',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'marinas near {city}, {state}' },
    { c: 'service-geo', q: 'boat slips for rent near {city}' },
    { c: 'service-geo', q: 'boat repair shops near {city}, {state}' },
    { c: 'service-geo', q: 'outboard motor repair near {city}' },
    { c: 'service-geo', q: 'winter boat storage near {city}, {state}' },
    { c: 'service-geo', q: 'mobile marine mechanic near {city}' },
    { c: 'service-geo', q: 'best full service marinas in {state}' },
    { c: 'service-geo', q: 'boat haul out and bottom painting near {city}' },
    { c: 'service-geo', q: 'fiberglass boat repair near {city}, {state}' },

    { c: 'cost', q: 'how much does a boat slip cost per season' },
    { c: 'cost', q: 'boat slip prices in {state}' },
    { c: 'cost', q: 'winter boat storage cost per foot' },
    { c: 'cost', q: 'how much does boat winterization cost' },
    { c: 'cost', q: 'marine mechanic hourly rate' },
    { c: 'cost', q: 'cost to repower a boat with a new outboard' },
    { c: 'cost', q: 'bottom painting cost per foot' },
    { c: 'cost', q: 'annual cost of owning a boat' },
    { c: 'cost', q: 'shrink wrap cost for a boat' },

    { c: 'permits', q: 'boating license requirements in {state}' },
    { c: 'permits', q: 'boat registration requirements in {state}' },
    { c: 'permits', q: 'what insurance does a marina require for a slip' },
    { c: 'permits', q: 'can I live aboard my boat at a marina in {state}' },
    { c: 'permits', q: 'can I work on my own boat at a marina' },
    { c: 'permits', q: 'Coast Guard required safety equipment for a boat' },

    { c: 'comparison', q: 'marina slip vs mooring' },
    { c: 'comparison', q: 'indoor vs outdoor winter boat storage' },
    { c: 'comparison', q: 'dry stack storage vs wet slip' },
    { c: 'comparison', q: 'dealer service department vs independent marine mechanic' },
    { c: 'comparison', q: 'repower vs rebuild an outboard motor' },
    { c: 'comparison', q: 'shrink wrap vs boat cover for winter' },

    { c: 'technical', q: 'how to winterize a boat engine' },
    { c: 'technical', q: 'when to haul out a boat for winter' },
    { c: 'technical', q: 'how often should a boat bottom be painted' },
    { c: 'technical', q: 'what does a boat survey include' },
    { c: 'technical', q: 'how often do outboard motors need service' },
    { c: 'technical', q: 'what is dry stack boat storage' },
    { c: 'technical', q: 'how to commission a boat in the spring' },
    { c: 'technical', q: 'what is an ABYC certified marine technician' },

    { c: 'application', q: 'marina for a sailboat with a deep draft near {city}' },
    { c: 'application', q: 'transient slip for a weekend near {city}' },
    { c: 'application', q: 'storage and service for a pontoon boat' },
    { c: 'application', q: 'marine electronics installation' },
    { c: 'application', q: 'pre purchase boat survey and inspection' },

    { c: 'problem', q: 'boat engine will not start' },
    { c: 'problem', q: 'outboard overheating' },
    { c: 'problem', q: 'blisters on a fiberglass hull' },
    { c: 'problem', q: 'boat taking on water' },
    { c: 'problem', q: 'marine mechanics booked for weeks in the spring' },
    { c: 'problem', q: 'gelcoat cracks and stress cracks' },

    { c: 'vendor-selection', q: 'how to choose a marina' },
    { c: 'vendor-selection', q: 'questions to ask a marina before signing a slip contract' },
    { c: 'vendor-selection', q: 'how to find a good marine mechanic' },
    { c: 'vendor-selection', q: 'what should a boat storage contract include' },
    { c: 'vendor-selection', q: 'is a marina with a service yard worth it' },
    { c: 'vendor-selection', q: 'how to compare winter storage quotes' },

    { c: 'buyer-role', q: 'marina for a new boat owner near {city}' },
    { c: 'buyer-role', q: 'yacht maintenance and management near {city}, {state}' },
    { c: 'buyer-role', q: 'boat service for a charter or fishing fleet in {state}' },
    { c: 'buyer-role', q: 'marina with slips for a boat club near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, matching services and review sites.
    'marinaseeker.com', 'findboatstorage.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'nextdoor.com', 'birdeye.com', 'thumbtack.com',
    'dockwa.com', 'marinas.com', 'snagaslip.com', 'boattrader.com', 'yachtworld.com',
    'boats.com', 'boatsetter.com', 'getmyboat.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, health systems, insurers, plan
    // sellers and software vendors that don't compete for the client.
    'waterwayguide.com', 'nauticalninja.com', 'sailingscuttlebutt.com', 'practical-sailor.com',
    'improvesailing.com', 'sportfishingmag.com', 'boatverdict.com', 'latestcost.com',
    'scribd.com', 'kipacboatstands.com', 'mercuryrepower.ca',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'uscg.mil', 'uscgboating.org', 'noaa.gov', 'epa.gov', 'boat-ed.com', 'boatus.com',
    'boatus.org', 'discoverboating.com', 'nmma.org', 'abycinc.org', 'marinaassociation.org',
    'boatingmag.com', 'boatingmagazine.com', 'sailmagazine.com', 'thehulltruth.com',
    'iboats.com', 'forbes.com', 'bankrate.com', 'nerdwallet.com', 'progressive.com',
    'geico.com', 'westmarine.com', 'defender.com', 'mercurymarine.com', 'yamahaoutboards.com',
    'suzukimarine.com', 'volvopenta.com', 'hondamarine.com', 'interlux.com', 'pettitpaint.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
