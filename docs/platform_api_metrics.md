# Platform API Metrics Framework

This document outlines the key API, product, data, and business metrics for a sector-flexible analytics SaaS platform built around the flow:

```text
Connect data -> ask questions -> get alerts -> explain changes -> recommend actions
```

The goal of these metrics is to measure three major areas:

1. **API health**: Is the platform reliable and fast?
2. **Data usefulness**: Is the connected business data fresh, complete, and trustworthy?
3. **Business intelligence value**: Are users getting useful insights, alerts, explanations, and recommended actions?

---

## 1. Core API Usage Metrics

These metrics show how the platform is being used across customers, endpoints, integrations, and features.

| Metric | What It Tells You |
|---|---|
| Total API requests | Overall platform usage |
| Requests by endpoint | Which features are used most |
| Requests by customer/account | Usage by tenant |
| Requests by data source | Which integrations are most valuable |
| Requests by user/team | Who is active |
| Peak request times | Capacity planning |
| API calls per dashboard | How expensive each dashboard is to load |
| API calls per question asked | Cost and complexity of conversational analytics |

Example endpoints to track:

```text
/data/connect
/data/sync
/query/ask
/dashboard/load
/alerts/check
/insights/explain
/recommendations/generate
/export/report
```

---

## 2. Performance Metrics

These are critical for dashboards, natural language questions, alerts, and AI-generated insights.

| Metric | Target or Use |
|---|---|
| Average response time | General API speed |
| P95 latency | How slow the system feels for most users |
| P99 latency | Worst-case user experience |
| Dashboard load time | User experience for reporting views |
| Query execution time | Speed of analytics answers |
| AI response time | Speed of explanations and recommendations |
| Data sync duration | Integration efficiency |
| Timeout rate | Reliability issue indicator |

Recommended performance tracking areas:

```text
Dashboard loads
Natural language questions
SQL/query generation
Alert evaluation
Data ingestion
AI-generated explanations
Recommendation generation
Exports
```

---

## 3. Reliability Metrics

These metrics show whether users can trust the system to work consistently.

| Metric | Why It Matters |
|---|---|
| Uptime | SaaS trust and availability |
| Error rate | API stability |
| Failed request rate | Operational quality |
| 4xx errors | Client, configuration, or user issues |
| 5xx errors | Platform or server issues |
| Retry rate | Hidden instability |
| Webhook failure rate | Integration reliability |
| Data connector failure rate | Source system reliability |
| Failed login/auth attempts | Security and user experience |
| Rate-limit hits | Usage pressure or poor design |

Useful breakdowns:

```text
Error rate by endpoint
Error rate by customer
Error rate by data source
Error rate by integration type
```

---

## 4. Data Ingestion and Sync Metrics

The value of the platform depends heavily on connected data. These metrics help determine whether the system is receiving fresh, complete, and usable data.

| Metric | What It Measures |
|---|---|
| Connected data sources | Total integrations per customer |
| Sync success rate | Data pipeline health |
| Sync failure rate | Broken connections |
| Rows ingested | Data volume |
| Records updated | Data freshness |
| Records rejected | Data quality issues |
| Duplicate records | Data cleanliness |
| Time since last successful sync | Data freshness |
| Average sync frequency | How live the system is |
| Schema change detection | Source system drift |

A very important metric for this platform is:

```text
Data Freshness Score
```

Example:

```text
Customer A:
CRM data last synced 12 minutes ago
Finance data last synced 3 hours ago
Inventory data last synced 2 days ago
```

This matters because business answers, alerts, and recommendations are only as good as the freshness of the underlying data.

---

## 5. Query and Question Metrics

For the “ask questions” feature, the platform should track both technical performance and business usefulness.

| Metric | What It Tells You |
|---|---|
| Questions asked | Adoption |
| Questions by category | What users care about |
| Questions answered successfully | Product usefulness |
| Failed questions | AI, data, or configuration gaps |
| Clarification rate | Whether questions are ambiguous |
| Follow-up question rate | Engagement |
| Query generation success rate | AI-to-SQL/API quality |
| Average answer confidence | Trust indicator |
| Human correction rate | Accuracy issue |
| Saved answers | High-value insights |
| Exported answers | Business workflow usage |

Possible question categories:

```text
Revenue
Sales
Customers
Inventory
Operations
Marketing
Finance
Risk
Compliance
Productivity
Exceptions
Forecasting
```

Useful product metric:

```text
Top 10 business questions this week
```

This could become a dashboard by itself and help each customer understand what their teams are trying to learn.

---

## 6. Alert Metrics

Alerts are a major value point because they turn passive dashboards into active decision support.

| Metric | What It Tells You |
|---|---|
| Alerts created | Adoption |
| Alerts triggered | Business activity |
| Alerts acknowledged | User engagement |
| Alerts ignored | Low-value or noisy alerts |
| Alert false positives | Alert quality |
| Alert false negatives | Missed issues |
| Time to acknowledge | Responsiveness |
| Time to resolve | Operational performance |
| Alerts by severity | Risk level |
| Alerts by business area | Where problems happen |

Good alert examples:

```text
Revenue dropped 18% compared to last week
Customer churn increased above threshold
Inventory below reorder point
Sales pipeline changed materially
Margin fell below target
Website conversions dropped
Unusual expense activity detected
```

---

## 7. Explanation Metrics

Explanation metrics track whether the system is doing more than showing numbers. They measure whether the platform helps users understand why something changed.

| Metric | Why It Matters |
|---|---|
| Explanations generated | Usage of AI insights |
| Explanations viewed | Engagement |
| Explanations accepted/helpful | Quality |
| Explanation confidence | Trust |
| Root causes identified | Analytical value |
| Data points cited per explanation | Traceability |
| User feedback rating | Product improvement |
| Explanation regeneration rate | First-answer quality |

Example explanation:

```text
Revenue is down 12%.
Main causes:
- Northeast sales down 21%
- Two large customers delayed orders
- Paid ad conversion rate dropped from 4.2% to 2.9%
```

The system should track whether users find these explanations useful, accurate, and actionable.

---

## 8. Recommendation Metrics

Recommendations are where the platform can become very sticky. These metrics help determine whether AI insights are leading to action.

| Metric | What It Measures |
|---|---|
| Recommendations generated | AI output volume |
| Recommendations viewed | User interest |
| Recommendations accepted | Business value |
| Recommendations dismissed | Relevance issue |
| Actions taken | Real adoption |
| Outcome after recommendation | ROI |
| Estimated impact | Value prediction |
| Realized impact | Actual value |
| Time from recommendation to action | Decision speed |

Example recommendation categories:

```text
Increase inventory reorder threshold
Contact at-risk customers
Reallocate marketing spend
Investigate expense spike
Follow up on stalled opportunities
Adjust staffing schedule
Promote high-margin products
```

One of the strongest metrics:

```text
Recommendation-to-Action Conversion Rate
```

This tells you whether the platform is actually influencing decisions.

---

## 9. Dashboard and Report Metrics

Even in an AI-first platform, dashboards and reports will still matter. These metrics help track reporting engagement and workflow value.

| Metric | What It Shows |
|---|---|
| Dashboard views | Usage |
| Dashboard load time | Performance |
| Most-used dashboards | High-value areas |
| Least-used dashboards | Cleanup or redesign opportunities |
| Widget interactions | Engagement |
| Filter usage | Analysis depth |
| Drill-down usage | Investigation behavior |
| Report exports | Business workflow usage |
| Scheduled reports | Stickiness |
| Shared dashboards | Team adoption |

Useful SaaS metric:

```text
Dashboards viewed per active user per week
```

---

## 10. Customer and Tenant Metrics

These metrics help run the SaaS business and identify adoption, expansion, and churn-risk patterns.

| Metric | Why It Matters |
|---|---|
| Active customers | Growth |
| Active users | Adoption |
| Seats used vs. seats purchased | Expansion opportunity |
| API calls by plan | Pricing alignment |
| Data volume by plan | Cost control |
| Integrations per customer | Stickiness |
| Alerts per customer | Engagement |
| Questions per customer | AI adoption |
| Reports scheduled | Operational dependency |
| Churn-risk behavior | Retention |

Possible churn-risk signals:

```text
No successful data sync in 7 days
Dashboard usage down 50%
No questions asked in 30 days
Alerts ignored repeatedly
Admin has not invited users
```

---

## 11. Security and Governance Metrics

These are especially important for enterprise customers and regulated industries.

| Metric | Why It Matters |
|---|---|
| Login attempts | Access monitoring |
| Failed logins | Security and user experience |
| API key usage | Integration tracking |
| API key age | Security hygiene |
| Token refresh failures | Broken integrations |
| Permission-denied events | Access control |
| Data export events | Governance |
| Sensitive query attempts | Compliance |
| Admin changes | Audit trail |
| Role changes | Security review |

An **audit log API** could become a valuable enterprise feature for customers that need compliance, traceability, and internal governance.

---

## 12. Cost and Infrastructure Metrics

AI-powered analytics can become expensive. These metrics help protect gross margin and guide pricing decisions.

| Metric | Why It Matters |
|---|---|
| API cost per customer | Profitability |
| AI token usage | LLM cost |
| Embedding/vector search usage | AI search cost |
| Database query cost | Infrastructure load |
| Storage per tenant | Plan pricing |
| Data transfer volume | Cloud cost |
| Cache hit rate | Performance and cost control |
| Failed AI calls | Wasted spend |
| Cost per answered question | Unit economics |
| Cost per dashboard load | Margin control |

Very important SaaS metric:

```text
Gross margin by customer
```

This is especially important if some customers connect large datasets and ask many AI-powered questions.

---

## 13. Business Outcome Metrics

This is where the product can separate itself from traditional dashboard tools.

| Metric | Example |
|---|---|
| Revenue impact | Identified a $42,000 opportunity |
| Risk reduced | Detected 8 abnormal changes |
| Time saved | Reduced manual reporting by 12 hours per week |
| Faster decisions | Alert acknowledged in 14 minutes |
| Opportunity found | Identified 5 underperforming segments |
| Operational savings | Inventory issue caught before a stockout |

This can support the sales pitch:

```text
The platform helped customers identify $X in opportunities,
reduce reporting time by Y%, and detect issues Z days earlier.
```

---

## Recommended MVP Metrics

For an MVP, do not try to track everything. Start with the most important metrics that prove the platform is useful, reliable, and economically viable.

```text
1. Total API requests
2. Requests by endpoint
3. Requests by customer
4. API error rate
5. P95 response time
6. Dashboard load time
7. Data sources connected
8. Sync success rate
9. Last successful sync time
10. Rows ingested
11. Questions asked
12. Questions answered successfully
13. Failed or unclear questions
14. Alerts created
15. Alerts triggered
16. Alerts acknowledged
17. Explanations generated
18. Recommendations accepted
19. Reports exported
20. Cost per customer
```

---

## Core Measurement Framework

The best metrics for this type of platform are not only technical API metrics like uptime and latency.

The strongest product metrics answer these questions:

```text
Can the system connect to data?
Can it answer useful questions?
Can it detect meaningful changes?
Can it explain why those changes happened?
Can it recommend actions?
Did the user act on those recommendations?
Did the action create value?
```

That is the real measurement framework for a modern analytics SaaS platform.

