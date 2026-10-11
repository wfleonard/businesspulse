/**
 * Industries worth a canned panel, ranked by how likely a business in them is
 * to buy AI visibility work: buyers who ask AI search before they call, a high
 * ticket or lifetime value, and owners who already pay for marketing.
 *
 * `npm run aeo:panels` adds entries missing from the aeo_panel_backlog table
 * and never changes existing ones, so rank, notes, and drafts edited in the
 * dashboard survive. None of these slugs may match a panel in CANNED_PANELS.
 *
 * Written 2026-10-11.
 */
export type PanelBacklogEntry = {
  slug: string
  name: string
  buyers: string
  rationale: string
}

export const PANEL_BACKLOG: PanelBacklogEntry[] = [
  {
    slug: 'personal-injury-lawyers',
    name: 'Personal injury lawyers',
    buyers: 'Accident victims and their families, often searching within days of a crash or injury',
    rationale: 'Highest-value clicks in local search; firms already spend heavily on marketing and feel AI answers taking calls',
  },
  {
    slug: 'family-law-attorneys',
    name: 'Family law attorneys',
    buyers: 'People facing divorce, custody, support, or adoption questions',
    rationale: 'Buyers research privately and at length before calling, exactly the conversation AI search now hosts',
  },
  {
    slug: 'estate-planning-attorneys',
    name: 'Estate planning and probate attorneys',
    buyers: 'Older adults, new parents, and executors handling an estate',
    rationale: 'Question-heavy research (wills vs trusts, probate costs) with long client value and referral chains',
  },
  {
    slug: 'criminal-defense-attorneys',
    name: 'Criminal defense and DUI attorneys',
    buyers: 'People charged with DUI, drug, or other offenses, and their families',
    rationale: 'Urgent, local, high-fee searches where being named first decides the call',
  },
  {
    slug: 'med-spas',
    name: 'Med spas and aesthetics',
    buyers: 'Adults comparing Botox, fillers, laser, and body contouring providers',
    rationale: 'Fast-growing, marketing-driven category where buyers ask AI to compare treatments, prices, and safety',
  },
  {
    slug: 'plastic-surgeons',
    name: 'Plastic and cosmetic surgeons',
    buyers: 'Adults researching cosmetic and reconstructive procedures',
    rationale: 'Very high ticket, long research cycle, and heavy comparison of surgeons and results',
  },
  {
    slug: 'real-estate-agents',
    name: 'Real estate agents and brokerages',
    buyers: 'Home buyers and sellers, relocating families, investors',
    rationale: 'Huge local category; "best agent in {city}" and "how to sell my house" are now AI questions',
  },
  {
    slug: 'mortgage-lenders',
    name: 'Mortgage brokers and lenders',
    buyers: 'First-time buyers, refinancers, self-employed borrowers, veterans',
    rationale: 'Rate and program questions are AI-native; local brokers compete with national lenders for citations',
  },
  {
    slug: 'insurance-agencies',
    name: 'Independent insurance agencies',
    buyers: 'Households and small businesses shopping home, auto, life, and commercial coverage',
    rationale: 'Recurring revenue per client; buyers ask AI to explain coverage before picking an agent',
  },
  {
    slug: 'accounting-tax',
    name: 'CPAs and tax preparers',
    buyers: 'Small business owners, self-employed people, households with complex returns',
    rationale: 'Recurring clients and seasonal urgency; tax questions are among the most common AI queries',
  },
  {
    slug: 'orthodontists',
    name: 'Orthodontists',
    buyers: 'Parents of children and teens, adults considering clear aligners',
    rationale: 'High ticket per case and heavy braces-vs-aligners comparison research; extends the dentists panel',
  },
  {
    slug: 'chiropractors',
    name: 'Chiropractors',
    buyers: 'Adults with back, neck, or sports injuries; auto accident patients',
    rationale: 'Dense local competition and owners who market actively',
  },
  {
    slug: 'physical-therapy',
    name: 'Physical therapy clinics',
    buyers: 'Post-surgery patients, athletes, older adults, and people with chronic pain',
    rationale: 'Direct-access rules let patients choose a clinic themselves, and they ask AI how',
  },
  {
    slug: 'dermatology',
    name: 'Dermatology practices',
    buyers: 'Adults and parents with skin conditions, plus cosmetic dermatology patients',
    rationale: 'Medical and cosmetic demand in one practice; long waitlists make "who can see me" searches common',
  },
  {
    slug: 'veterinarians',
    name: 'Veterinarians and animal hospitals',
    buyers: 'Pet owners choosing a regular vet or needing emergency care',
    rationale: 'Loyal, recurring clients and frequent urgent "vet near me open now" questions',
  },
  {
    slug: 'mental-health-therapy',
    name: 'Therapists and counseling practices',
    buyers: 'Adults, couples, and parents looking for therapy, often checking insurance',
    rationale: 'Buyers research privately through AI and filter by specialty and insurance',
  },
  {
    slug: 'addiction-treatment',
    name: 'Addiction treatment centers',
    buyers: 'People seeking help for substance use and the family members searching for them',
    rationale: 'Very high value per admission and heavy competition from directories and referral sites',
  },
  {
    slug: 'senior-living',
    name: 'Assisted living and senior living',
    buyers: 'Adult children choosing care for a parent',
    rationale: 'Large monthly fees, long research, and directories like A Place for Mom dominating answers',
  },
  {
    slug: 'auto-repair',
    name: 'Auto repair shops',
    buyers: 'Drivers needing repairs, maintenance, inspections, or a trustworthy mechanic',
    rationale: 'Very frequent local searches; trust questions ("honest mechanic near me") favor AI answers',
  },
  {
    slug: 'water-damage-restoration',
    name: 'Water, fire, and mold restoration',
    buyers: 'Homeowners and property managers after floods, leaks, fires, or mold',
    rationale: 'Emergency, insurance-paid, high-ticket jobs where the first company named gets the call',
  },
  {
    slug: 'foundation-repair',
    name: 'Foundation repair',
    buyers: 'Homeowners with cracks, settling, or failed inspections',
    rationale: 'High ticket with anxious, question-heavy research; pairs with basement waterproofing',
  },
  {
    slug: 'garage-doors',
    name: 'Garage door installation and repair',
    buyers: 'Homeowners with a broken spring or opener, or replacing a door',
    rationale: 'Urgent repairs and replacements in a category crowded with lead-gen sites',
  },
  {
    slug: 'house-painting',
    name: 'House painting',
    buyers: 'Homeowners and property managers planning interior or exterior painting',
    rationale: 'Very common project with lots of cost and comparison questions',
  },
  {
    slug: 'flooring',
    name: 'Flooring installation',
    buyers: 'Homeowners choosing hardwood, LVP, tile, or carpet',
    rationale: 'Material comparison questions are AI-native and lead straight to an installer',
  },
  {
    slug: 'concrete-paving',
    name: 'Concrete and asphalt paving',
    buyers: 'Homeowners, HOAs, and businesses needing driveways, patios, and parking lots',
    rationale: 'Residential and commercial demand; cost questions dominate',
  },
  {
    slug: 'fencing',
    name: 'Fence installation',
    buyers: 'Homeowners, pool owners, and businesses',
    rationale: 'Material, cost, and permit questions make a strong panel',
  },
  {
    slug: 'decks-patios',
    name: 'Decks, patios, and outdoor living',
    buyers: 'Homeowners planning decks, pergolas, screened porches, and patios',
    rationale: 'High ticket, permit-heavy, and full of comparison questions (composite vs wood)',
  },
  {
    slug: 'custom-home-builders',
    name: 'Custom home builders',
    buyers: 'Families building a new home or a knockdown rebuild',
    rationale: 'Highest ticket in residential construction, with a long research cycle',
  },
  {
    slug: 'septic-services',
    name: 'Septic services',
    buyers: 'Rural and suburban homeowners, home buyers needing septic inspections',
    rationale: 'Recurring pumping plus high-ticket replacements; inspection rules vary by state',
  },
  {
    slug: 'water-treatment-wells',
    name: 'Well drilling and water treatment',
    buyers: 'Well owners and homeowners worried about water quality',
    rationale: 'Water quality questions (PFAS, hardness) are rising fast in AI search',
  },
  {
    slug: 'home-inspectors',
    name: 'Home inspectors',
    buyers: 'Home buyers and sellers during a sale',
    rationale: 'Every home sale needs one, and buyers ask AI what an inspection covers',
  },
  {
    slug: 'junk-removal',
    name: 'Junk removal and dumpster rental',
    buyers: 'Homeowners, estate cleanouts, contractors, and landlords',
    rationale: 'Frequent, fast-decision local searches dominated by franchises',
  },
  {
    slug: 'security-systems',
    name: 'Security and alarm installers',
    buyers: 'Homeowners and businesses comparing monitored security, cameras, and access control',
    rationale: 'Recurring monitoring revenue; local installers compete with national DIY brands',
  },
  {
    slug: 'locksmiths',
    name: 'Locksmiths',
    buyers: 'People locked out, plus homeowners and businesses upgrading locks',
    rationale: 'Urgent searches in a category notorious for scam listings, so trust matters',
  },
  {
    slug: 'appliance-repair',
    name: 'Appliance repair',
    buyers: 'Homeowners with a broken washer, fridge, oven, or dishwasher',
    rationale: 'Repair-vs-replace questions are AI-native and lead to a same-week booking',
  },
  {
    slug: 'towing-roadside',
    name: 'Towing and roadside assistance',
    buyers: 'Stranded drivers, fleet managers, and body shops',
    rationale: 'Urgent, local, mobile-first searches; pairs with collision repair',
  },
  {
    slug: 'property-management',
    name: 'Property management companies',
    buyers: 'Landlords, investors, and HOA and condo boards',
    rationale: 'Recurring percentage fees; owners research fees and services carefully',
  },
  {
    slug: 'commercial-real-estate',
    name: 'Commercial real estate brokers',
    buyers: 'Business owners leasing or buying space, investors',
    rationale: 'Large commissions and B2B buyers who research through AI',
  },
  {
    slug: 'staffing-agencies',
    name: 'Staffing and recruiting agencies',
    buyers: 'Employers hiring temporary, contract, or permanent staff',
    rationale: 'B2B recurring revenue; employers ask AI who staffs their industry locally',
  },
  {
    slug: 'commercial-printing-signs',
    name: 'Sign and commercial printing companies',
    buyers: 'Businesses needing signs, vehicle wraps, banners, and printed materials',
    rationale: 'Steady B2B demand from local businesses',
  },
  {
    slug: 'civil-engineering',
    name: 'Civil engineering and land surveying',
    buyers: 'Developers, municipalities, contractors, and property owners',
    rationale: 'B2B and public-sector buyers; fits the utility and municipal clients already served',
  },
  {
    slug: 'architects',
    name: 'Architects',
    buyers: 'Homeowners planning major renovations, developers, and businesses',
    rationale: 'High-value projects where buyers ask AI whether they need an architect and what it costs',
  },
  {
    slug: 'environmental-consulting',
    name: 'Environmental consulting',
    buyers: 'Property buyers, lenders, developers, and industrial sites needing assessments and remediation',
    rationale: 'Regulation-driven B2B work (Phase I ESAs, oil tanks, remediation) with real budgets',
  },
  {
    slug: 'wedding-venues',
    name: 'Wedding and event venues',
    buyers: 'Engaged couples and event planners',
    rationale: 'High ticket and heavy comparison; directories like The Knot dominate answers today',
  },
  {
    slug: 'catering',
    name: 'Catering',
    buyers: 'Couples, corporate event planners, and families planning events',
    rationale: 'Frequent event-driven searches and an easy fit with venues',
  },
  {
    slug: 'childcare',
    name: 'Daycare and childcare centers',
    buyers: 'Parents of infants through school-age children',
    rationale: 'Years of tuition per family; parents research licensing, cost, and safety in depth',
  },
  {
    slug: 'private-schools',
    name: 'Private schools',
    buyers: 'Parents comparing private, parochial, and Montessori schools',
    rationale: 'Very high lifetime value and long comparison research',
  },
  {
    slug: 'funeral-homes',
    name: 'Funeral homes and cremation',
    buyers: 'Families arranging a funeral, and adults preplanning their own',
    rationale: 'Families decide quickly with little prior research; cost transparency questions are common',
  },
  {
    slug: 'fitness-personal-training',
    name: 'Gyms and personal training studios',
    buyers: 'Adults looking for a gym, boutique studio, or personal trainer',
    rationale: 'Recurring memberships in a crowded local category',
  },
  {
    slug: 'pet-care',
    name: 'Dog grooming, boarding, and daycare',
    buyers: 'Pet owners needing grooming, boarding, daycare, or training',
    rationale: 'Recurring local services where trust and reviews drive the choice',
  },
]
