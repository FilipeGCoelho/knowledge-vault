# UI Observability

Events (non-PII)

| Event | Fields | Notes |
| --- | --- | --- |
| ui_page_load | route, ts, duration_ms | Fired on route mount |
| ui_form_submit | route, action, ts, duration_ms, outcome | outcome values: ok, error |
| ui_a11y_violations | route, count, severity_max | Axe scan summary |
| refine_submit | goal_len, weights, duration_ms, outcome | Correlate to API refinement_latency_ms |
| proposal_generate | source, input_len, duration_ms, outcome | Correlate to proposal_latency_ms |

Derived Metrics

- time_to_first_valid_refinement_ms (p50/p90)
- refinement_success_rate
- time_to_first_valid_proposal_ms (p50/p90)
- proposal_validation_errors_total

Correlation

- Propagate `x-correlation-id` where applicable; align names with API logs: `correlation_id`, `action`, `duration_ms`.

Dashboards

- UI performance (TTI, route load); Refinement success; Proposal errors

Last Updated: 2025-10-09
