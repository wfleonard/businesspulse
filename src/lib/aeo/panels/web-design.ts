import type { CannedPanelDefinition } from './index'

/**
 * Web design and web development studios: business websites, online stores,
 * custom web apps, redesigns, hosting and maintenance, and the small studios
 * and freelancers who do all of it. Buyers are small business owners,
 * nonprofits, practices, and teams that need an internal tool built.
 *
 * Rules questions (accessibility, privacy policies, who owns the site and the
 * domain) use the "regulation" category; there are no permits.
 *
 * Agency directories and freelance marketplaces are directory domains.
 * Website builders (Wix, Squarespace, GoDaddy, Shopify, Webflow) are on
 * neither list: buyers weigh them against hiring a designer, so they compete.
 *
 * Written 2026-10-06. Validate against a known business before relying on it.
 */
export const webDesign: CannedPanelDefinition = {
  slug: 'web-design',
  name: 'Web design & development',

  questions: [
    { c: 'service-geo', q: '{service} near {city}, {state}' },
    { c: 'service-geo', q: 'web design companies near {city}, {state}' },
    { c: 'service-geo', q: 'small business website designer in {city}' },
    { c: 'service-geo', q: 'best web developers in {state} for small businesses' },
    { c: 'service-geo', q: 'custom web application developers near {city}, {state}' },
    { c: 'service-geo', q: 'who can fix or update my website near {city}' },
    { c: 'service-geo', q: 'website redesign agency in {state}' },

    { c: 'cost', q: 'how much does a small business website cost' },
    { c: 'cost', q: 'how much does a custom web application cost to build' },
    { c: 'cost', q: 'how much does website maintenance cost per month' },
    { c: 'cost', q: 'how much does website hosting cost for a small business' },
    { c: 'cost', q: 'what does a web designer charge per hour' },
    { c: 'cost', q: 'how much does an online store website cost' },
    { c: 'cost', q: 'how much does a website redesign cost' },
    { c: 'cost', q: 'hidden costs of a website after launch' },

    { c: 'regulation', q: 'does my business website have to be ADA accessible' },
    { c: 'regulation', q: 'does my website need a privacy policy and cookie notice' },
    { c: 'regulation', q: 'who owns my website and domain if a web designer builds it' },
    { c: 'regulation', q: 'can I use images I found on Google on my business website' },

    { c: 'comparison', q: 'web designer vs website builder like Wix or Squarespace' },
    { c: 'comparison', q: 'freelance web designer vs web design agency' },
    { c: 'comparison', q: 'WordPress vs custom-coded website for a small business' },
    { c: 'comparison', q: 'custom web app vs off-the-shelf software' },
    { c: 'comparison', q: 'local web designer vs hiring one overseas' },
    { c: 'comparison', q: 'Shopify vs WordPress for a small online store' },
    { c: 'comparison', q: 'monthly website plan vs paying for a website upfront' },

    { c: 'technical', q: 'how long does it take to build a business website' },
    { c: 'technical', q: 'what happens during a website redesign' },
    { c: 'technical', q: 'what should a small business website include' },
    { c: 'technical', q: 'how do I move my website to a new host without downtime' },
    { c: 'technical', q: 'what does website maintenance include' },
    { c: 'technical', q: 'how to make a website show up in ChatGPT and AI search' },
    { c: 'technical', q: 'how to make a website load faster' },
    { c: 'technical', q: 'what is structured data and does my website need it' },

    { c: 'application', q: 'website for a contractor or home service business' },
    { c: 'application', q: 'website with online booking and payments' },
    { c: 'application', q: 'members-only area with Google or Microsoft sign-in' },
    { c: 'application', q: 'nonprofit website that takes donations' },
    { c: 'application', q: 'custom portal for customers to track orders or projects' },
    { c: 'application', q: 'internal web app to replace spreadsheets' },

    { c: 'problem', q: 'my web developer disappeared and I can’t update my website' },
    { c: 'problem', q: 'my website was hacked, what do I do' },
    { c: 'problem', q: 'my website is down and I don’t know who hosts it' },
    { c: 'problem', q: 'my website looks outdated and gets no leads' },
    { c: 'problem', q: 'my contact form stopped sending emails' },
    { c: 'problem', q: 'Google says my website is not mobile friendly' },

    { c: 'vendor-selection', q: 'how to choose a web designer for a small business' },
    { c: 'vendor-selection', q: 'questions to ask a web designer before hiring' },
    { c: 'vendor-selection', q: 'red flags when hiring a web developer' },
    { c: 'vendor-selection', q: 'what should a website design contract include' },
    { c: 'vendor-selection', q: 'how to check a web designer’s past work and references' },

    { c: 'buyer-role', q: 'web design for a small business owner with no time to manage the site' },
    { c: 'buyer-role', q: 'website for a nonprofit or community organization in {state}' },
    { c: 'buyer-role', q: 'developer to build an internal tool for an operations team' },
    { c: 'buyer-role', q: 'web designer for a medical, dental, or law practice' },
    { c: 'buyer-role', q: 'startup founder looking for someone to build a web app MVP' },
  ],

  directoryDomains: [
    // Agency directories, freelance marketplaces, and listings: cited only through one of these is renting the answer.
    'clutch.co', 'upcity.com', 'designrush.com', 'goodfirms.co', 'sortlist.com', 'themanifest.com',
    'agencyspotter.com', 'expertise.com', 'topdevelopers.co', 'techreviewer.co',
    'upwork.com', 'fiverr.com', 'toptal.com', 'freelancer.com', 'guru.com', 'peopleperhour.com',
    '99designs.com', 'dribbble.com', 'behance.net', 'contra.com',
    'thumbtack.com', 'bark.com', 'angi.com', 'homeadvisor.com', 'houzz.com',
    'yelp.com', 'bbb.org', 'yellowpages.com', 'manta.com', 'mapquest.com', 'chamberofcommerce.com',
    'superpages.com', 'nextdoor.com', 'birdeye.com',
    'g2.com', 'capterra.com', 'trustpilot.com',
    'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  ],

  referenceDomains: [
    'wikipedia.org', 'reddit.com', 'quora.com', 'medium.com', 'stackoverflow.com', 'github.com',
    // Standards, government, and platform documentation.
    'w3.org', 'developer.mozilla.org', 'web.dev', 'developers.google.com', 'support.google.com',
    'google.com', 'bing.com', 'schema.org', 'ada.gov', 'justice.gov', 'ftc.gov', 'sba.gov',
    'copyright.gov', 'icann.org', 'wordpress.org', 'cloudflare.com', 'letsencrypt.org',
    // Web and design press.
    'smashingmagazine.com', 'css-tricks.com', 'nngroup.com', 'alistapart.com', 'wpbeginner.com',
    'searchengineland.com', 'searchenginejournal.com', 'forbes.com', 'investopedia.com', 'nerdwallet.com',
    'patch.com', 'prnewswire.com', 'businesswire.com', 'globenewswire.com', 'einpresswire.com',
  ],
}
