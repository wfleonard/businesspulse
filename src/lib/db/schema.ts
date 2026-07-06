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
  insight,
  alertRule,
  alert,
  recommendation,
  aiQuery,
  auditLog,
}
