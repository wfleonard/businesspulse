import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  numeric,
  jsonb,
  integer,
  index,
  uniqueIndex,
  pgEnum,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

/* ------------------------------------------------------------------ */
/* better-auth core tables                                             */
/* Field (property) names must match better-auth's model field names. */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)]
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)]
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)]
)

/* ------------------------------------------------------------------ */
/* Tenancy — one org per user in MVP; the seam for multi-tenant SaaS.  */
/* Every business-data table carries org_id from day one.             */
/* ------------------------------------------------------------------ */

export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member'])

export const membership = pgTable(
  'membership',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('owner'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('membership_org_user_idx').on(t.orgId, t.userId),
    index('membership_user_idx').on(t.userId),
  ]
)

/* ------------------------------------------------------------------ */
/* Data sources — manual / csv / api. Credentials encrypted at rest.   */
/* ------------------------------------------------------------------ */

export const dataSourceKindEnum = pgEnum('data_source_kind', ['manual', 'csv', 'api'])
export const dataSourceStatusEnum = pgEnum('data_source_status', [
  'active',
  'paused',
  'error',
])

export const dataSource = pgTable(
  'data_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    kind: dataSourceKindEnum('kind').notNull(),
    name: text('name').notNull(),
    status: dataSourceStatusEnum('status').notNull().default('active'),
    /** AES-256-GCM ciphertext of the connector config (base URL, auth, mapping). */
    configEncrypted: text('config_encrypted'),
    lastSyncedAt: timestamp('last_synced_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('data_source_org_idx').on(t.orgId)]
)

/* ------------------------------------------------------------------ */
/* Metrics — definitions + time-series values.                         */
/* ------------------------------------------------------------------ */

export const metricDirectionEnum = pgEnum('metric_direction', ['up_good', 'down_good'])

export const metricDefinition = pgTable(
  'metric_definition',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    unit: text('unit'),
    category: text('category'),
    direction: metricDirectionEnum('direction').notNull().default('up_good'),
    target: numeric('target'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('metric_definition_org_key_idx').on(t.orgId, t.key)]
)

export const metricValue = pgTable(
  'metric_value',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    metricKey: text('metric_key').notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    value: numeric('value').notNull(),
    sourceId: uuid('source_id').references(() => dataSource.id, {
      onDelete: 'set null',
    }),
    dimensions: jsonb('dimensions').$type<Record<string, string>>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('metric_value_org_key_period_idx').on(t.orgId, t.metricKey, t.periodStart),
  ]
)

/* ------------------------------------------------------------------ */
/* General ledger — chart of accounts + transactions. Reports derive   */
/* from these, adapting to each customer's own accounts.               */
/* ------------------------------------------------------------------ */

export const accountTypeEnum = pgEnum('account_type', [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
])

export const ledgerAccount = pgTable(
  'ledger_account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    code: text('code'),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    /** free-form classifier: bank, accounts_receivable, cogs, payroll, … */
    subtype: text('subtype'),
    parentId: uuid('parent_id').references((): AnyPgColumn => ledgerAccount.id, {
      onDelete: 'set null',
    }),
    currency: text('currency').notNull().default('USD'),
    isActive: boolean('is_active').notNull().default(true),
    externalId: text('external_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('ledger_account_org_name_idx').on(t.orgId, t.name)]
)

export const ledgerEntry = pgTable(
  'ledger_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => ledgerAccount.id, { onDelete: 'cascade' }),
    date: timestamp('date').notNull(),
    /** Signed amount in the account's NATURAL direction: positive increases the
     * account's normal balance (income +revenue, expense +cost, asset +value). */
    amount: numeric('amount').notNull(),
    description: text('description'),
    party: text('party'), // vendor / customer / employee
    category: text('category'),
    sourceId: uuid('source_id').references(() => dataSource.id, { onDelete: 'set null' }),
    externalId: text('external_id'),
    dimensions: jsonb('dimensions').$type<Record<string, string>>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('ledger_entry_org_account_date_idx').on(t.orgId, t.accountId, t.date)]
)

/* ------------------------------------------------------------------ */
/* Insights, alerts, alert rules.                                      */
/* ------------------------------------------------------------------ */

export const insight = pgTable(
  'insight',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    metricKey: text('metric_key').notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    delta: numeric('delta'),
    summary: text('summary').notNull(),
    drivers: jsonb('drivers').$type<unknown[]>().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('insight_org_idx').on(t.orgId)]
)

export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical'])
export const alertStatusEnum = pgEnum('alert_status', ['open', 'acknowledged', 'resolved'])

export const alertRule = pgTable(
  'alert_rule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    metricKey: text('metric_key').notNull(),
    /** e.g. 'pct_drop', 'below_target', 'above_threshold' */
    condition: text('condition').notNull(),
    threshold: numeric('threshold'),
    channel: text('channel').notNull().default('email'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('alert_rule_org_idx').on(t.orgId)]
)

export const alert = pgTable(
  'alert',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    ruleId: uuid('rule_id').references(() => alertRule.id, { onDelete: 'set null' }),
    metricKey: text('metric_key').notNull(),
    severity: alertSeverityEnum('severity').notNull().default('warning'),
    status: alertStatusEnum('status').notNull().default('open'),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('alert_org_status_idx').on(t.orgId, t.status)]
)

/* ------------------------------------------------------------------ */
/* Recommendations — AI-suggested next actions the owner can act on.   */
/* ------------------------------------------------------------------ */

export const recommendationPriorityEnum = pgEnum('recommendation_priority', [
  'high',
  'medium',
  'low',
])
export const recommendationStatusEnum = pgEnum('recommendation_status', [
  'suggested',
  'accepted',
  'dismissed',
  'done',
])

export const recommendation = pgTable(
  'recommendation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    rationale: text('rationale').notNull(),
    priority: recommendationPriorityEnum('priority').notNull().default('medium'),
    metricRefs: jsonb('metric_refs').$type<string[]>().default([]),
    status: recommendationStatusEnum('status').notNull().default('suggested'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('recommendation_org_status_idx').on(t.orgId, t.status)]
)

/* ------------------------------------------------------------------ */
/* Audit & AI query logs — references only, never raw values/secrets.  */
/* ------------------------------------------------------------------ */

export const aiQuery = pgTable(
  'ai_query',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    metricRefs: jsonb('metric_refs').$type<string[]>().default([]),
    model: text('model'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('ai_query_org_idx').on(t.orgId)]
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => organization.id, { onDelete: 'set null' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    target: text('target'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('audit_log_org_idx').on(t.orgId)]
)

/* ------------------------------------------------------------------ */
/* AEO snapshots — public, pre-account submissions. Deliberately NOT   */
/* org-scoped: these are Saxon's operational data, visible only to the */
/* admin. See docs/aeo-build-spec.md, Section 6.                       */
/* ------------------------------------------------------------------ */

export type AeoSource = { url: string; title: string; cited: boolean }
export type AeoRival = { host: string; title: string; cited: boolean }

/** Questions generated for one run when no canned panel fits the business. */
export type AeoGeneratedPanel = {
  questions: { c: string; q: string }[]
  referenceDomains: string[]
  model: string
  /** False when the homepage couldn't be read and questions came from the form alone. */
  siteRead: boolean
  costUsd: number
  generatedAt: string
}

export const aeoLeadStatusEnum = pgEnum('aeo_lead_status', [
  'new',
  'contacted',
  'won',
  'ignored',
])
export const aeoRunTierEnum = pgEnum('aeo_run_tier', ['snapshot', 'full'])
export const aeoPanelSourceEnum = pgEnum('aeo_panel_source', ['canned', 'generated'])
/** form: the public snapshot form. outbound: a prospect snapshot run from the dashboard. */
export const aeoRequestSourceEnum = pgEnum('aeo_request_source', ['form', 'outbound'])
export const aeoRunStatusEnum = pgEnum('aeo_run_status', ['queued', 'running', 'done', 'failed'])

/** Canned vertical question panels. Questions carry slots like {service} and {state}. */
export const aeoPanel = pgTable('aeo_panel', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  questions: jsonb('questions').$type<{ c: string; q: string }[]>().notNull(),
  directoryDomains: jsonb('directory_domains').$type<string[]>().notNull().default([]),
  /** Non-competitors for this vertical: regulators, trade press, manufacturers. */
  referenceDomains: jsonb('reference_domains').$type<string[]>().notNull().default([]),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * One visibility run: both the job the worker claims and the report it produces.
 * Postgres is the queue (FOR UPDATE SKIP LOCKED) because Valkey runs without
 * persistence and would lose queued jobs on restart.
 */
export const aeoRun = pgTable(
  'aeo_run',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Unguessable report URL segment — 18 random bytes, base64url. */
    publicId: text('public_id').notNull().unique(),
    domain: text('domain').notNull(),
    tier: aeoRunTierEnum('tier').notNull().default('snapshot'),
    engines: jsonb('engines').$type<string[]>().notNull().default(['perplexity']),
    panelSource: aeoPanelSourceEnum('panel_source').notNull(),
    panelSlug: text('panel_slug'),
    panelVersion: integer('panel_version'),
    /** Generated runs only. Stored so a retry asks the same questions without paying to generate them again. */
    generatedPanel: jsonb('generated_panel').$type<AeoGeneratedPanel>(),
    /** Admin re-runs: claimed even when today's spend is over the cap. */
    bypassSpendCap: boolean('bypass_spend_cap').notNull().default(false),
    /** Views of the finished report by visitors (not bots or signed-in admins), recorded by the report page. */
    reportViewCount: integer('report_view_count').notNull().default(0),
    reportFirstViewedAt: timestamp('report_first_viewed_at'),
    reportLastViewedAt: timestamp('report_last_viewed_at'),
    status: aeoRunStatusEnum('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    /**
     * Running: last heartbeat; the run is reclaimable once this is older than the
     * lease. Queued after a failed attempt: when that attempt ended, which gates
     * the retry delay.
     */
    lockedAt: timestamp('locked_at'),
    /** Set on claim. Every write back to the run requires it, so a worker that lost its lease can't clobber the one that took over. */
    leaseToken: uuid('lease_token'),
    questionCount: integer('question_count').notNull().default(0),
    /** Questions where the business's own site was cited by at least one engine. */
    citedCount: integer('cited_count').notNull().default(0),
    costUsd: numeric('cost_usd').notNull().default('0'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
  },
  (t) => [
    index('aeo_run_status_created_idx').on(t.status, t.createdAt),
    index('aeo_run_domain_idx').on(t.domain),
  ]
)

/** One public form submission. Several requests may share one run (30-day reuse). */
export const aeoRequest = pgTable(
  'aeo_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    businessName: text('business_name').notNull(),
    /** Normalized: lowercase, no scheme, no path, no leading "www.". */
    domain: text('domain').notNull(),
    service: text('service').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    /** Chosen vertical, or null for a generated panel. */
    panelSlug: text('panel_slug'),
    contactConsent: boolean('contact_consent').notNull().default(false),
    /** sha256 of the emailed token; the token itself is never stored. */
    verifyTokenHash: text('verify_token_hash').notNull().unique(),
    verifyExpiresAt: timestamp('verify_expires_at').notNull(),
    verifiedAt: timestamp('verified_at'),
    ipAddress: text('ip_address'),
    leadStatus: aeoLeadStatusEnum('lead_status').notNull().default('new'),
    /** Outbound requests never get the automatic report email and stay out of the form funnel. */
    source: aeoRequestSourceEnum('source').notNull().default('form'),
    /** Set when they unsubscribe from the re-check email; contact consent is cleared with it. */
    unsubscribedAt: timestamp('unsubscribed_at'),
    runId: uuid('run_id').references(() => aeoRun.id, { onDelete: 'set null' }),
    /** When the "report ready" email went out. Null until then; the worker sweeps for these. */
    reportEmailedAt: timestamp('report_emailed_at'),
    reportEmailAttempts: integer('report_email_attempts').notNull().default(0),
    reportEmailAttemptedAt: timestamp('report_email_attempted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('aeo_request_domain_idx').on(t.domain),
    index('aeo_request_email_idx').on(t.email),
    index('aeo_request_created_idx').on(t.createdAt),
  ]
)

/** One row per question × engine, as written by `panel.php job`. */
export const aeoResult = pgTable(
  'aeo_result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => aeoRun.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    query: text('query').notNull(),
    engine: text('engine').notNull(),
    model: text('model'),
    ownCited: boolean('own_cited').notNull().default(false),
    nameMentioned: boolean('name_mentioned').notNull().default(false),
    directoryOnly: boolean('directory_only').notNull().default(false),
    ownRank: integer('own_rank'),
    rivals: jsonb('rivals').$type<AeoRival[]>().notNull().default([]),
    sources: jsonb('sources').$type<AeoSource[]>().notNull().default([]),
    answer: text('answer'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    searches: integer('searches').notNull().default(0),
    costUsd: numeric('cost_usd').notNull().default('0'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('aeo_result_run_idx').on(t.runId)]
)

/**
 * A 30-day re-check: a fresh run for a consenting lead, and the email that
 * compares it with their first report. One per request.
 */
export const aeoRecheck = pgTable(
  'aeo_recheck',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => aeoRequest.id, { onDelete: 'cascade' }),
    runId: uuid('run_id')
      .notNull()
      .references(() => aeoRun.id, { onDelete: 'cascade' }),
    /** sha256 of the unsubscribe token, set when the email goes out. */
    tokenHash: text('token_hash').unique(),
    emailedAt: timestamp('emailed_at'),
    emailAttempts: integer('email_attempts').notNull().default(0),
    emailAttemptedAt: timestamp('email_attempted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('aeo_recheck_request_idx').on(t.requestId), index('aeo_recheck_run_idx').on(t.runId)]
)

/** "Book a call" clicks from a report, recorded by /book. Deleted with the run. */
export const aeoBookingClick = pgTable(
  'aeo_booking_click',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => aeoRun.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('aeo_booking_click_run_idx').on(t.runId)]
)

export const schema = {
  user,
  session,
  account,
  verification,
  organization,
  membership,
  dataSource,
  metricDefinition,
  metricValue,
  ledgerAccount,
  ledgerEntry,
  insight,
  alertRule,
  alert,
  recommendation,
  aiQuery,
  auditLog,
  aeoPanel,
  aeoRun,
  aeoRequest,
  aeoResult,
  aeoBookingClick,
  aeoRecheck,
}
