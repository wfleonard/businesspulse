/**
 * Domain lists for runs without a canned panel's own lists: generated panels,
 * and the report's directory tags for those runs.
 */

/** Listings and marketplaces: being cited only through one of these is "renting" the answer. */
export const COMMON_DIRECTORY_DOMAINS = [
  'yelp.com', 'bbb.org', 'yellowpages.com', 'angi.com', 'thumbtack.com', 'houzz.com',
  'homeadvisor.com', 'nextdoor.com', 'mapquest.com', 'manta.com', 'chamberofcommerce.com',
  'superpages.com', 'tripadvisor.com', 'facebook.com', 'instagram.com', 'linkedin.com',
  // Software, professional-services, and hiring directories.
  'clutch.co', 'goodfirms.co', 'designrush.com', 'g2.com', 'capterra.com', 'upwork.com',
  'indeed.com', 'glassdoor.com',
]

/** Never competitors, whatever the business. */
export const COMMON_REFERENCE_DOMAINS = ['wikipedia.org', 'reddit.com', 'quora.com', 'youtube.com']
