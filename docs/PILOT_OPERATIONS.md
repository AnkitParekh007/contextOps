# Controlled Customer Pilot Runbook

## 1. Qualify the use case

Target a company already paying for repeated AI work with a measurable denominator: e.g. support-ticket classification, invoice extraction or lead triage. Request **monthly volume**, token distribution, current provider invoices and a representative manually labeled sample. Without labels, the model-comparison quality gate cannot be proven.

Select one workflow, one business owner, and success/error thresholds before the pilot. Avoid regulated, confidential or special-category records until external security/privacy approval.

## 2. Run a dry run

- Create a workspace.
- Import the 500 Northwind synthetic tickets.
- Run workload analysis and inspect task categories.
- Evaluate `MOCK / mock-efficient` with explicit rate assumptions.
- Review the test-set quality, baseline quality, failure modes and model costs.
- Create a simulation policy only if the gates pass.
- Run shadow mode and export the Markdown report.

The synthetic case demonstrates software functionality, not commercial value.

## 3. Prepare authorized business data

Ask the customer to export records they are entitled to use. Redact before export; preview again at upload. Complete customer consent, terms/data processing review and retention policy. Do not transfer data to OpenAI/Anthropic until their processing is individually approved.

## 4. Evaluate systematically

- Label samples independently; do not provide expected answers in model prompts.
- Segment by task category, risk, time period and rare failure modes.
- Measure exact labels/F1/schema validity for structured work; use calibrated human rubrics for free text.
- Track premium baseline quality and candidate quality with a noninferiority margin.
- Include errors, retries, model-call counts, latency and manual review overhead.
- Quarantine high-risk or unknown task classes.

## 5. Interpret savings

Sample shadow projection is not net realized saving. For a proper business case, scale using representative monthly volume, include actual provider rates, fallback attempts, infrastructure, management fees and quality-related rework. If cost per successful task worsens, do not recommend deployment.

## 6. Commercial evidence

Provide a report that distinguishes **observed**, **assumed**, **estimated**, **simulated**, and **verified** data. For this MVP, verified is always unavailable. Never use a simulated amount as a testimonial.

## 7. Exit / deletion

Export required records, then delete the workspace via Settings as an authorized owner/admin. The operation deletes workspace domain rows; retention of organization audit entries and any external copies must be handled separately.
