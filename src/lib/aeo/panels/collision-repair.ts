import type { CannedPanelDefinition } from './index'

/**
 * Collision and body shops: accident repair, dent and paint work, frame
 * straightening, ADAS calibration, and insurance claims. Buyers are drivers
 * after an accident, plus fleet managers, dealerships, and leasing returns.
 *
 * Insurers are references, not competitors: they appear in answers about
 * claims, not as places that repair the car.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const collisionRepair: CannedPanelDefinition = {
  slug: 'collision-repair',
  name: 'Collision & body shops',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'auto body shops near {city}, {state}' },
    { c: 'service-geo', q: 'collision repair shop open Saturdays near {city}' },
    { c: 'service-geo', q: 'best body shops in {state}' },
    { c: 'service-geo', q: 'paintless dent repair near {city}' },
    { c: 'service-geo', q: 'certified collision repair for Tesla or luxury cars near {city}' },
    { c: 'service-geo', q: 'frame straightening shops near {city}, {state}' },
    { c: 'service-geo', q: 'ADAS camera and sensor calibration near {city}' },
    { c: 'service-geo', q: 'auto paint shops near {city}, {state}' },
    { c: 'service-geo', q: 'body shops that work with my insurance near {city}' },

    { c: 'cost', q: 'how much does collision repair cost' },
    { c: 'cost', q: 'bumper repair vs replacement cost' },
    { c: 'cost', q: 'how much does paintless dent repair cost' },
    { c: 'cost', q: 'cost to repaint a car' },
    { c: 'cost', q: 'how much does frame damage cost to fix' },
    { c: 'cost', q: 'should I pay out of pocket or file an insurance claim' },
    { c: 'cost', q: 'what is a car insurance deductible and how does it work for repairs' },
    { c: 'cost', q: 'diminished value claim after an accident' },

    { c: 'permits', q: 'can I choose my own body shop in {state}' },
    { c: 'permits', q: 'is the insurance company required to use OEM parts in {state}' },
    { c: 'permits', q: 'what happens if the insurer totals my car' },
    { c: 'permits', q: 'auto body shop license requirements in {state}' },
    { c: 'permits', q: 'how to dispute an insurance repair estimate' },
    { c: 'permits', q: 'lease return damage rules and fees' },

    { c: 'comparison', q: 'OEM vs aftermarket body parts' },
    { c: 'comparison', q: 'dealer body shop vs independent body shop' },
    { c: 'comparison', q: 'insurance preferred shop vs my own shop' },
    { c: 'comparison', q: 'paintless dent repair vs traditional dent repair' },
    { c: 'comparison', q: 'Caliber Collision vs a local body shop' },
    { c: 'comparison', q: 'repair vs total loss' },

    { c: 'technical', q: 'how long does collision repair take' },
    { c: 'technical', q: 'what is ADAS calibration after a collision' },
    { c: 'technical', q: 'what does I-CAR Gold Class mean' },
    { c: 'technical', q: 'what is a supplement on an auto insurance claim' },
    { c: 'technical', q: 'will my car be the same after frame repair' },
    { c: 'technical', q: 'how do body shops match paint color' },
    { c: 'technical', q: 'what warranty comes with collision repairs' },
    { c: 'technical', q: 'what is an OEM certified collision center' },

    { c: 'application', q: 'repairing an electric vehicle after an accident' },
    { c: 'application', q: 'hail damage repair' },
    { c: 'application', q: 'deer collision repair' },
    { c: 'application', q: 'fixing scratches and dents before a lease return' },
    { c: 'application', q: 'fleet vehicle collision repair' },
    { c: 'application', q: 'windshield replacement after a collision' },

    { c: 'problem', q: 'body shop is taking too long to fix my car' },
    { c: 'problem', q: 'paint does not match after repair' },
    { c: 'problem', q: 'car still has problems after collision repair' },
    { c: 'problem', q: 'warning lights on after an accident repair' },
    { c: 'problem', q: 'insurance adjuster estimate too low' },
    { c: 'problem', q: 'rental car coverage ran out during repairs' },

    { c: 'vendor-selection', q: 'questions to ask an auto body shop' },
    { c: 'vendor-selection', q: 'how to choose a collision repair shop' },
    { c: 'vendor-selection', q: 'how to compare body shop estimates' },
    { c: 'vendor-selection', q: 'what certifications should a body shop have' },
    { c: 'vendor-selection', q: 'should I get more than one body shop estimate' },
    { c: 'vendor-selection', q: 'does a body shop guarantee its work' },

    { c: 'buyer-role', q: 'collision repair for a company fleet in {state}' },
    { c: 'buyer-role', q: 'body shop for a leased car near {city}' },
    { c: 'buyer-role', q: 'collision repair partner for a car dealership in {state}' },
    { c: 'buyer-role', q: 'body shop that handles rideshare or commercial vehicles near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, marketplaces and review sites.
    'autobodyshopnear.com', 'loc8nearme.com', 'whocanfixmycar.com', 'enigma.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'nextdoor.com', 'birdeye.com', 'justdial.com',
    'expertise.com', 'bestcompany.com', 'consumeraffairs.com', 'repairpal.com', 'carwise.com',
    'mechanicadvisor.com', 'openbay.com', 'thumbtack.com', 'angi.com', 'facebook.com',
    'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
    'superpages.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, research, insurers, lenders,
    // software, manufacturers and document hosts that don't compete for the job.
    'aaa.com', 'plymouthrock.com', 'synchrony.com', 'capitalone.com', 'consumershield.com',
    'shouselaw.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'nhtsa.gov', 'iihs.org', 'ftc.gov', 'naic.org', 'iii.org', 'i-car.com', 'ase.com',
    'asashop.org', 'ciclink.com', 'repairerdrivennews.com', 'fenderbender.com',
    'collisionweek.com', 'kbb.com', 'edmunds.com', 'caranddriver.com', 'motortrend.com',
    'cars.com', 'carfax.com', 'consumerreports.org', 'forbes.com', 'bankrate.com',
    'nerdwallet.com', 'valuepenguin.com', 'thezebra.com', 'carinsurance.com',
    'geico.com', 'progressive.com', 'statefarm.com', 'allstate.com', 'libertymutual.com',
    'usaa.com', 'farmers.com', 'nationwide.com', 'travelers.com', 'amfam.com',
    'ppg.com', 'axalta.com', 'sherwin-automotive.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
