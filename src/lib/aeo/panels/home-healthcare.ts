import type { CannedPanelDefinition } from './index'

/**
 * Home healthcare: in-home personal care and companion care, skilled home
 * health nursing and therapy, live-in and overnight care, and respite. Buyers
 * are adult children arranging care for a parent, spouses, discharge planners
 * and social workers, and older adults themselves.
 *
 * Questions are about arranging and paying for care, never a diagnosis.
 * Rules questions (Medicare and Medicaid coverage, licensing) use the
 * "regulation" category. Franchise agencies (Home Instead, Visiting Angels,
 * Comfort Keepers) are competitors, not directories.
 *
 * Written 2026-09-21. Validate against a known business before relying on it.
 */
export const homeHealthcare: CannedPanelDefinition = {
  slug: 'home-healthcare',
  name: 'Home healthcare',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'home care agencies near {city}, {state}' },
    { c: 'service-geo', q: 'in home senior care near {city}' },
    { c: 'service-geo', q: 'home health aides near {city}, {state}' },
    { c: 'service-geo', q: 'best home care companies in {state}' },
    { c: 'service-geo', q: '24 hour live in caregivers near {city}' },
    { c: 'service-geo', q: 'dementia and Alzheimer care at home near {city}' },
    { c: 'service-geo', q: 'Medicare certified home health agencies in {state}' },
    { c: 'service-geo', q: 'companion care for seniors near {city}' },
    { c: 'service-geo', q: 'respite care near {city}, {state}' },

    { c: 'cost', q: 'how much does in home care cost per hour' },
    { c: 'cost', q: 'home care cost in {state}' },
    { c: 'cost', q: 'live in caregiver cost per day' },
    { c: 'cost', q: 'home care vs assisted living cost' },
    { c: 'cost', q: 'how to pay for in home care' },
    { c: 'cost', q: 'does long term care insurance pay for home care' },
    { c: 'cost', q: 'is in home care tax deductible' },
    { c: 'cost', q: 'VA benefits for in home care' },

    { c: 'regulation', q: 'does Medicare pay for home care' },
    { c: 'regulation', q: 'Medicaid home care programs in {state}' },
    { c: 'regulation', q: 'home care agency license requirements in {state}' },
    { c: 'regulation', q: 'caregiver training and certification requirements in {state}' },
    { c: 'regulation', q: 'can I get paid as a family caregiver in {state}' },
    { c: 'regulation', q: 'what is a plan of care and who writes it' },

    { c: 'comparison', q: 'home health care vs home care' },
    { c: 'comparison', q: 'agency caregiver vs private caregiver' },
    { c: 'comparison', q: 'home care vs nursing home' },
    { c: 'comparison', q: 'live in care vs 24 hour shift care' },
    { c: 'comparison', q: 'Home Instead vs Visiting Angels vs a local agency' },
    { c: 'comparison', q: 'companion care vs personal care' },

    { c: 'technical', q: 'what does a home health aide do' },
    { c: 'technical', q: 'what is skilled nursing at home' },
    { c: 'technical', q: 'how does a home care assessment work' },
    { c: 'technical', q: 'how quickly can home care start' },
    { c: 'technical', q: 'what is the minimum number of hours for home care' },
    { c: 'technical', q: 'how are caregivers screened and matched' },
    { c: 'technical', q: 'what happens if the caregiver calls out' },
    { c: 'technical', q: 'what is respite care' },

    { c: 'application', q: 'home care after a hospital discharge' },
    { c: 'application', q: 'home care after hip or knee surgery' },
    { c: 'application', q: 'care for a parent with dementia who wants to stay home' },
    { c: 'application', q: 'overnight care for a parent who wanders' },
    { c: 'application', q: 'hospice support at home' },
    { c: 'application', q: 'home care for a spouse recovering from a stroke' },

    { c: 'problem', q: 'parent refuses help at home' },
    { c: 'problem', q: 'caregiver burnout' },
    { c: 'problem', q: 'elderly parent falling at home' },
    { c: 'problem', q: 'unhappy with our home care agency' },
    { c: 'problem', q: 'caring for a parent long distance' },
    { c: 'problem', q: 'signs a senior needs in home care' },

    { c: 'vendor-selection', q: 'questions to ask a home care agency' },
    { c: 'vendor-selection', q: 'how to choose a home care agency' },
    { c: 'vendor-selection', q: 'are home care workers bonded and insured' },
    { c: 'vendor-selection', q: 'how to check home health agency ratings' },
    { c: 'vendor-selection', q: 'what should a home care contract include' },
    { c: 'vendor-selection', q: 'red flags when hiring a caregiver' },

    { c: 'buyer-role', q: 'home care for my mother near {city}' },
    { c: 'buyer-role', q: 'discharge planner looking for a home health agency in {state}' },
    { c: 'buyer-role', q: 'home care for a veteran in {state}' },
    { c: 'buyer-role', q: 'home care arranged by an elder law attorney or care manager near {city}' },
  ],

  directoryDomains: [
    // Found in live validation, 2026-09-21: directories, matching services and review sites.
    'careyaya.org', 'npiguide.com', 'homecare.co.uk',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'birdeye.com', 'nextdoor.com', 'caring.com',
    'aplaceformom.com', 'care.com', 'seniorly.com', 'homecare.com', 'homecareadvocacy.org',
    'seniorliving.org', 'seniorhomes.com', 'agingcare.com', 'carelistings.com', 'homeadvisor.com',
    'facebook.com', 'instagram.com', 'linkedin.com', 'mapquest.com', 'manta.com',
    'chamberofcommerce.com', 'superpages.com', 'indeed.com', 'glassdoor.com',
  ],

  referenceDomains: [
    // Found in live validation, 2026-09-21: publishers, health systems, insurers, plan
    // sellers and software vendors that don't compete for the client.
    'hopkinsmedicine.org', 'healthdirect.gov.au', 'ageuk.org.uk', 'eldercarestartguide.com',
    'wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com',
    'medicare.gov', 'medicaid.gov', 'cms.gov', 'va.gov', 'acl.gov', 'eldercare.acl.gov',
    'longtermcare.acl.gov', 'nia.nih.gov', 'nih.gov', 'cdc.gov', 'irs.gov', 'ssa.gov',
    'nahc.org', 'aginglifecare.org', 'alz.org', 'caregiver.org', 'caregiving.org',
    'nhpco.org', 'aarp.org', 'ncoa.org', 'payingforseniorcare.com', 'genworth.com',
    'carescout.com', 'mayoclinic.org', 'clevelandclinic.org', 'webmd.com', 'healthline.com',
    'forbes.com', 'nerdwallet.com', 'bankrate.com', 'investopedia.com', 'usnews.com',
    'nolo.com', 'elderlawanswers.com',
    'patch.com', 'einpresswire.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  ],
}
