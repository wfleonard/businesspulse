/**
 * Finding an industry panel by what people call their business: "roofer",
 * "plumber", "lawyer". Each panel gets a group for browsing and everyday search
 * words. Panels added later from the backlog without an entry here still show
 * up, under "More industries", and are found by their name.
 */

export const INDUSTRY_GROUPS = [
  'Home services and repair',
  'Construction and contractors',
  'Outdoor and property',
  'Health and wellness',
  'Legal, financial, and insurance',
  'Real estate',
  'Auto and transport',
  'Business services and technology',
  'Events, family, and community',
  'Specialty retail',
  'More industries',
] as const

export type IndustryGroup = (typeof INDUSTRY_GROUPS)[number]

type Meta = { group: IndustryGroup; keywords: string[] }

const HOME: IndustryGroup = 'Home services and repair'
const BUILD: IndustryGroup = 'Construction and contractors'
const OUTDOOR: IndustryGroup = 'Outdoor and property'
const HEALTH: IndustryGroup = 'Health and wellness'
const LEGAL: IndustryGroup = 'Legal, financial, and insurance'
const REALTY: IndustryGroup = 'Real estate'
const AUTO: IndustryGroup = 'Auto and transport'
const BUSINESS: IndustryGroup = 'Business services and technology'
const EVENTS: IndustryGroup = 'Events, family, and community'
const RETAIL: IndustryGroup = 'Specialty retail'

export const INDUSTRY_META: Record<string, Meta> = {
  // Live panels
  'ai-visibility': { group: BUSINESS, keywords: ['aeo', 'seo', 'ai search', 'marketing agency', 'digital marketing', 'answer engine'] },
  'bathroom-remodeling': { group: BUILD, keywords: ['bathroom', 'bath remodel', 'shower', 'tile', 'remodeler', 'renovation'] },
  'basement-waterproofing': { group: HOME, keywords: ['waterproofing', 'wet basement', 'sump pump', 'crawl space', 'french drain'] },
  'collision-repair': { group: AUTO, keywords: ['body shop', 'auto body', 'collision', 'dent repair', 'car paint'] },
  'commercial-roofing': { group: BUILD, keywords: ['roofer', 'roofing', 'flat roof', 'commercial roof', 'tpo', 'epdm'] },
  'commercial-cleaning': { group: BUSINESS, keywords: ['janitorial', 'cleaning', 'office cleaning', 'cleaners', 'custodial'] },
  'excavation-site-work': { group: BUILD, keywords: ['excavator', 'excavation', 'grading', 'site work', 'land clearing', 'earthwork'] },
  'electrical-contracting': { group: BUILD, keywords: ['electrician', 'electrical', 'wiring', 'generator', 'ev charger'] },
  'hdd-trenchless': { group: BUILD, keywords: ['directional drilling', 'boring', 'hdd', 'trenchless', 'utility contractor', 'fiber install'] },
  'financial-advisors': { group: LEGAL, keywords: ['financial planner', 'wealth management', 'investment advisor', 'retirement planning', 'ria'] },
  'general-contractors': { group: BUILD, keywords: ['general contractor', 'gc', 'builder', 'construction company', 'remodeling', 'renovation'] },
  dentists: { group: HEALTH, keywords: ['dentist', 'dental', 'dental office', 'teeth', 'cosmetic dentistry', 'implants'] },
  'home-healthcare': { group: HEALTH, keywords: ['home care', 'home health', 'caregivers', 'senior care', 'nursing'] },
  'it-msp': { group: BUSINESS, keywords: ['it support', 'managed services', 'msp', 'computer repair', 'cybersecurity', 'tech support'] },
  'fire-protection': { group: BUILD, keywords: ['fire sprinkler', 'fire alarm', 'fire extinguisher', 'suppression', 'fire safety'] },
  'moving-companies': { group: AUTO, keywords: ['movers', 'moving', 'relocation', 'storage', 'packing'] },
  'kitchen-remodeling': { group: BUILD, keywords: ['kitchen', 'kitchen remodel', 'cabinets', 'countertops', 'remodeler', 'renovation'] },
  'hvac-plumbing': { group: HOME, keywords: ['plumber', 'plumbing', 'hvac', 'heating', 'air conditioning', 'ac repair', 'furnace', 'boiler', 'water heater'] },
  'municipal-advisors': { group: LEGAL, keywords: ['municipal finance', 'bond advisor', 'public finance', 'government finance'] },
  'marine-services': { group: AUTO, keywords: ['marina', 'boat repair', 'boatyard', 'marine mechanic', 'boat storage', 'dock'] },
  'residential-roofing': { group: BUILD, keywords: ['roofer', 'roofing', 'roof repair', 'roof replacement', 'shingles', 'gutters'] },
  'religious-art': { group: RETAIL, keywords: ['catholic', 'religious', 'church supplies', 'christian gifts', 'icons', 'prints'] },
  landscaping: { group: OUTDOOR, keywords: ['landscaper', 'lawn care', 'lawn mowing', 'hardscaping', 'gardening', 'snow removal'] },
  'tree-services': { group: OUTDOOR, keywords: ['tree removal', 'arborist', 'tree trimming', 'stump grinding', 'tree service'] },
  'pools-hot-tubs': { group: OUTDOOR, keywords: ['pool', 'swimming pool', 'hot tub', 'spa', 'pool builder', 'pool service'] },
  'pest-control': { group: HOME, keywords: ['exterminator', 'pest control', 'termites', 'bed bugs', 'rodents', 'wildlife removal'] },
  siding: { group: BUILD, keywords: ['siding', 'vinyl siding', 'exterior', 'gutters', 'trim'] },
  'solar-installers': { group: BUILD, keywords: ['solar', 'solar panels', 'solar installer', 'battery storage', 'renewable energy'] },
  'windows-doors': { group: BUILD, keywords: ['windows', 'doors', 'window replacement', 'entry doors', 'glass'] },
  'web-design': { group: BUSINESS, keywords: ['web designer', 'website', 'web developer', 'web agency', 'app developer', 'wordpress'] },

  // Backlog industries: ready for when their panels go live
  'personal-injury-lawyers': { group: LEGAL, keywords: ['lawyer', 'attorney', 'personal injury', 'accident lawyer', 'law firm'] },
  'family-law-attorneys': { group: LEGAL, keywords: ['lawyer', 'attorney', 'divorce', 'custody', 'family law', 'law firm'] },
  'estate-planning-attorneys': { group: LEGAL, keywords: ['lawyer', 'attorney', 'wills', 'trusts', 'probate', 'elder law', 'law firm'] },
  'criminal-defense-attorneys': { group: LEGAL, keywords: ['lawyer', 'attorney', 'dui', 'dwi', 'criminal defense', 'law firm'] },
  'med-spas': { group: HEALTH, keywords: ['med spa', 'botox', 'fillers', 'aesthetics', 'laser', 'skin care'] },
  'plastic-surgeons': { group: HEALTH, keywords: ['plastic surgery', 'cosmetic surgery', 'surgeon', 'breast', 'facelift'] },
  'real-estate-agents': { group: REALTY, keywords: ['realtor', 'real estate agent', 'broker', 'home sales', 'listing agent'] },
  'mortgage-lenders': { group: LEGAL, keywords: ['mortgage', 'mortgage broker', 'home loans', 'refinance', 'lender'] },
  'insurance-agencies': { group: LEGAL, keywords: ['insurance', 'insurance agent', 'auto insurance', 'home insurance', 'business insurance'] },
  'accounting-tax': { group: LEGAL, keywords: ['accountant', 'cpa', 'tax preparer', 'bookkeeping', 'tax prep', 'payroll'] },
  orthodontists: { group: HEALTH, keywords: ['orthodontist', 'braces', 'invisalign', 'aligners'] },
  chiropractors: { group: HEALTH, keywords: ['chiropractor', 'chiropractic', 'back pain', 'adjustment'] },
  'physical-therapy': { group: HEALTH, keywords: ['physical therapist', 'pt', 'rehab', 'sports injury', 'physiotherapy'] },
  dermatology: { group: HEALTH, keywords: ['dermatologist', 'skin doctor', 'acne', 'skin cancer'] },
  veterinarians: { group: HEALTH, keywords: ['vet', 'veterinarian', 'animal hospital', 'pet clinic', 'emergency vet'] },
  'mental-health-therapy': { group: HEALTH, keywords: ['therapist', 'counselor', 'counseling', 'psychologist', 'mental health'] },
  'addiction-treatment': { group: HEALTH, keywords: ['rehab', 'addiction', 'detox', 'recovery', 'substance abuse'] },
  'senior-living': { group: HEALTH, keywords: ['assisted living', 'senior living', 'memory care', 'nursing home', 'retirement community'] },
  'auto-repair': { group: AUTO, keywords: ['mechanic', 'auto repair', 'car repair', 'oil change', 'brakes', 'auto shop'] },
  'water-damage-restoration': { group: HOME, keywords: ['water damage', 'restoration', 'mold remediation', 'fire damage', 'flood cleanup'] },
  'foundation-repair': { group: BUILD, keywords: ['foundation', 'foundation repair', 'structural repair', 'crack repair', 'underpinning'] },
  'garage-doors': { group: HOME, keywords: ['garage door', 'garage door repair', 'garage door opener'] },
  'house-painting': { group: HOME, keywords: ['painter', 'painting', 'house painter', 'interior painting', 'exterior painting'] },
  flooring: { group: HOME, keywords: ['flooring', 'hardwood', 'carpet', 'tile floor', 'vinyl plank', 'floor installer'] },
  'concrete-paving': { group: OUTDOOR, keywords: ['paving', 'asphalt', 'concrete', 'driveway', 'sealcoating', 'paver'] },
  fencing: { group: OUTDOOR, keywords: ['fence', 'fencing', 'fence installer', 'vinyl fence', 'wood fence'] },
  'decks-patios': { group: OUTDOOR, keywords: ['deck builder', 'decks', 'patio', 'pergola', 'outdoor kitchen', 'hardscape'] },
  'custom-home-builders': { group: BUILD, keywords: ['home builder', 'custom homes', 'new construction', 'builder'] },
  'septic-services': { group: OUTDOOR, keywords: ['septic', 'septic pumping', 'septic install', 'cesspool'] },
  'water-treatment-wells': { group: HOME, keywords: ['well drilling', 'well pump', 'water treatment', 'water softener', 'water filtration'] },
  'home-inspectors': { group: REALTY, keywords: ['home inspector', 'home inspection', 'radon', 'inspection'] },
  'junk-removal': { group: HOME, keywords: ['junk removal', 'dumpster rental', 'hauling', 'cleanout'] },
  'security-systems': { group: HOME, keywords: ['security system', 'alarm', 'cameras', 'cctv', 'access control'] },
  locksmiths: { group: HOME, keywords: ['locksmith', 'locks', 'lockout', 'rekey', 'keys'] },
  'appliance-repair': { group: HOME, keywords: ['appliance repair', 'washer repair', 'refrigerator repair', 'dryer repair'] },
  'towing-roadside': { group: AUTO, keywords: ['towing', 'tow truck', 'roadside assistance', 'wrecker'] },
  'property-management': { group: REALTY, keywords: ['property manager', 'property management', 'rentals', 'hoa management', 'landlord'] },
  'commercial-real-estate': { group: REALTY, keywords: ['commercial real estate', 'cre broker', 'office space', 'industrial', 'retail space'] },
  'staffing-agencies': { group: BUSINESS, keywords: ['staffing', 'recruiting', 'recruiter', 'temp agency', 'employment agency'] },
  'commercial-printing-signs': { group: BUSINESS, keywords: ['signs', 'sign shop', 'printing', 'print shop', 'banners', 'vehicle wraps'] },
  'civil-engineering': { group: BUSINESS, keywords: ['civil engineer', 'land surveyor', 'surveying', 'engineering firm'] },
  architects: { group: BUSINESS, keywords: ['architect', 'architecture', 'design firm'] },
  'environmental-consulting': { group: BUSINESS, keywords: ['environmental', 'phase 1', 'remediation', 'environmental consultant'] },
  'wedding-venues': { group: EVENTS, keywords: ['wedding venue', 'event venue', 'banquet hall', 'reception'] },
  catering: { group: EVENTS, keywords: ['caterer', 'catering', 'event food', 'party catering'] },
  childcare: { group: EVENTS, keywords: ['daycare', 'childcare', 'preschool', 'day care'] },
  'private-schools': { group: EVENTS, keywords: ['private school', 'academy', 'prep school', 'catholic school'] },
  'funeral-homes': { group: EVENTS, keywords: ['funeral home', 'funeral', 'cremation', 'memorial'] },
  'fitness-personal-training': { group: HEALTH, keywords: ['gym', 'personal trainer', 'fitness', 'crossfit', 'yoga studio'] },
  'pet-care': { group: EVENTS, keywords: ['dog grooming', 'groomer', 'dog boarding', 'kennel', 'doggy daycare', 'pet sitting'] },
}

export type IndustryOption = { slug: string; name: string }

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** How well an industry matches a search; 0 means no match. */
export function industryScore(option: IndustryOption, query: string): number {
  const q = normalize(query)
  if (!q) return 1
  const name = normalize(option.name)
  const keywords = (INDUSTRY_META[option.slug]?.keywords ?? []).map(normalize)
  const words = q.split(' ')
  if (name === q || keywords.includes(q)) return 100
  if (name.startsWith(q)) return 80
  if (keywords.some((k) => k.startsWith(q))) return 70
  if (name.includes(q)) return 60
  if (keywords.some((k) => k.includes(q))) return 50
  // Every word somewhere: "roof repair nj" style searches.
  const haystack = [name, ...keywords].join(' ')
  const meaningful = words.filter((w) => w.length > 1)
  if (meaningful.length && meaningful.every((w) => haystack.includes(w))) return 40
  // A word that matches the start of a name or keyword word: "plumb", "dentis".
  if (meaningful.some((w) => w.length >= 3 && haystack.split(' ').some((h) => h.startsWith(w)))) return 20
  return 0
}

export type IndustryGroupResult = { label: string; options: IndustryOption[] }

/**
 * The options to show for a search, grouped. With no search, every industry
 * in its group, A to Z. With a search, best matches first in one list.
 */
export function searchIndustries(options: IndustryOption[], query: string): IndustryGroupResult[] {
  const groupOf = (slug: string): IndustryGroup => INDUSTRY_META[slug]?.group ?? 'More industries'
  if (!normalize(query)) {
    return INDUSTRY_GROUPS.map((group) => ({
      label: group,
      options: options.filter((o) => groupOf(o.slug) === group).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.options.length)
  }
  const matches = options
    .map((o) => ({ o, score: industryScore(o, query) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.o.name.localeCompare(b.o.name))
    .map((m) => m.o)
  return matches.length ? [{ label: 'Best matches', options: matches }] : []
}
