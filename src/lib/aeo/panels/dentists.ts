import type { CannedPanelDefinition } from './index'

/**
 * Dentists: general and family dentistry, cosmetic work, implants,
 * emergencies, and pediatric patients. Buyers are patients choosing a
 * practice, parents, and older adults.
 *
 * Questions are about choosing, reaching, and paying for a dentist, and what
 * common treatments involve, never a diagnosis. Rules questions (insurance,
 * licensing, patient rights) use the "regulation" category.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const dentists: CannedPanelDefinition = {
  slug: 'dentists',
  name: 'Dentists',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'dentists near {city}, {state}' },
    { c: 'service-geo', q: 'family dentist accepting new patients near {city}' },
    { c: 'service-geo', q: 'emergency dentist near {city}, {state}' },
    { c: 'service-geo', q: 'dental implant dentists near {city}' },
    { c: 'service-geo', q: 'cosmetic dentist near {city}, {state}' },
    { c: 'service-geo', q: 'best dentists in {state}' },
    { c: 'service-geo', q: 'Invisalign providers near {city}' },
    { c: 'service-geo', q: 'dentist open Saturdays near {city}' },
    { c: 'service-geo', q: 'sedation dentist for anxious patients near {city}' },

    { c: 'cost', q: 'how much does a dental implant cost' },
    { c: 'cost', q: 'dental cleaning cost without insurance' },
    { c: 'cost', q: 'how much does a crown cost' },
    { c: 'cost', q: 'root canal cost with and without insurance' },
    { c: 'cost', q: 'porcelain veneers cost per tooth' },
    { c: 'cost', q: 'Invisalign cost' },
    { c: 'cost', q: 'dental membership plans vs dental insurance' },
    { c: 'cost', q: 'payment plans and financing for dental work' },
    { c: 'cost', q: 'dental implant cost in {state}' },

    { c: 'regulation', q: 'does Medicare cover dental care' },
    { c: 'regulation', q: 'how to find a dentist that accepts my insurance' },
    { c: 'regulation', q: 'dentists that accept Medicaid in {state}' },
    { c: 'regulation', q: 'how to check a dentist license in {state}' },
    { c: 'regulation', q: 'can a dentist refuse to release my records or x-rays' },
    { c: 'regulation', q: 'in network vs out of network dentist' },

    { c: 'comparison', q: 'dental implant vs bridge' },
    { c: 'comparison', q: 'Invisalign vs braces' },
    { c: 'comparison', q: 'crown vs filling' },
    { c: 'comparison', q: 'veneers vs bonding' },
    { c: 'comparison', q: 'private practice dentist vs a dental chain' },
    { c: 'comparison', q: 'general dentist vs periodontist for implants' },

    { c: 'technical', q: 'how often should I see a dentist' },
    { c: 'technical', q: 'what happens at a first dental visit' },
    { c: 'technical', q: 'how long does a dental implant take from start to finish' },
    { c: 'technical', q: 'what is a deep cleaning at the dentist' },
    { c: 'technical', q: 'how long do dental crowns last' },
    { c: 'technical', q: 'what types of sedation do dentists offer' },
    { c: 'technical', q: 'what is same day crown technology' },
    { c: 'technical', q: 'how long do veneers last' },

    { c: 'application', q: 'dentist for young children' },
    { c: 'application', q: 'dentist for seniors with dentures' },
    { c: 'application', q: 'dentist for patients with dental anxiety' },
    { c: 'application', q: 'full mouth reconstruction' },
    { c: 'application', q: 'teeth whitening at the dentist vs at home' },

    { c: 'problem', q: 'toothache and no dentist appointment available' },
    { c: 'problem', q: 'chipped or broken tooth what to do' },
    { c: 'problem', q: 'lost a filling or crown' },
    { c: 'problem', q: 'bleeding gums when brushing' },
    { c: 'problem', q: 'loose denture' },
    { c: 'problem', q: 'afraid of the dentist' },

    { c: 'vendor-selection', q: 'how to choose a dentist' },
    { c: 'vendor-selection', q: 'questions to ask a new dentist' },
    { c: 'vendor-selection', q: 'how to read dentist reviews' },
    { c: 'vendor-selection', q: 'should I get a second opinion on dental work' },
    { c: 'vendor-selection', q: 'how to switch dentists' },
    { c: 'vendor-selection', q: 'what makes a good implant dentist' },

    { c: 'buyer-role', q: 'dentist for a family with kids near {city}' },
    { c: 'buyer-role', q: 'dentist for an older parent in {state}' },
    { c: 'buyer-role', q: 'dentist near my office in {city}' },
    { c: 'buyer-role', q: 'dental care for a company employee benefits program in {state}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, matching services and review sites.
    'realself.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'birdeye.com', 'nextdoor.com', 'zocdoc.com',
    'healthgrades.com', 'vitals.com', 'opencare.com', '1800dentist.com', 'topdentists.com',
    'ratemds.com', 'doctor.webmd.com', 'caredash.com', 'sharecare.com', 'castleconnolly.com',
    'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com',
    'chamberofcommerce.com', 'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, health systems, insurers, plan
    // sellers and software vendors that don't compete for the client.
    'dentaly.org', 'realdentalcosts.com', 'askthedentist.com', 'healthandlifemags.com',
    'dentalplans.com', 'hotalinginsurance.com', 'canamericaplus.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'ada.org', 'mouthhealthy.org', 'aapd.org', 'perio.org', 'aaoinfo.org', 'agd.org', 'aacd.com',
    'nidcr.nih.gov', 'nih.gov', 'cdc.gov', 'medicare.gov', 'medicaid.gov', 'cms.gov',
    'mayoclinic.org', 'clevelandclinic.org', 'webmd.com', 'healthline.com', 'medicalnewstoday.com',
    'verywellhealth.com', 'colgate.com', 'crest.com', 'invisalign.com', 'straumann.com',
    'nobelbiocare.com', 'deltadental.com', 'metlife.com', 'cigna.com', 'aetna.com',
    'guardiandirect.com', 'humana.com', 'carecredit.com', 'forbes.com', 'nerdwallet.com',
    'bankrate.com', 'consumerreports.org', 'aarp.org', 'goodrx.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
