## ADDED Requirements

### Requirement: Price library page must exit loading within a bound
The Mixing `#/price-library` client SHALL NOT remain on an unbounded spinner when `GET /api/price-library/active` (or its WebUI/exe proxy equivalent) stalls. After a configured timeout (default ≤ 30s) OR a transport error, the page MUST show a recoverable error state with Retry.

#### Scenario: Org active fetch times out
- **WHEN** authenticated user opens `#/price-library` and the active fetch does not complete within the client timeout
- **THEN** the infinite spinner MUST stop and an error Alert (or equivalent) with Retry MUST appear

#### Scenario: Org active fetch returns error status
- **WHEN** active fetch completes with HTTP 401/403/5xx or network failure
- **THEN** the page MUST show that failure (not keep spinning) and offer Retry

### Requirement: Active catalog UI load MUST use a scalable payload
The system SHALL provide a way for the price-library table UI to load the published catalog without requiring a single multi‑megabyte JSON body of every product field (including bulky optional fields such as `raw_json`) as a hard dependency for first paint.

#### Scenario: First paint with large catalog
- **WHEN** the published active catalog has ≥ 3000 products
- **THEN** `#/price-library` MUST reach a usable table state (version badge + at least the first page of rows) without waiting forever on a full-dump download

#### Scenario: Full dump retained for non-UI consumers
- **WHEN** quotation MCP / export tooling needs the full active set
- **THEN** a full dump endpoint OR documented existing `/active` MAY remain available, but UI MUST NOT block first paint on that path alone if it times out

### Requirement: Org active probe MUST be operationally measurable
Ops SHALL be able to measure auth-gated `/api/price-library/active` (or successor list endpoint) response time and download size with a scripted probe using org login (`POST /login`) + Bearer token.

#### Scenario: Probe reports size and time
- **WHEN** ops runs the documented probe against `ORG_CENTER_URL`
- **THEN** the probe MUST print HTTP status, elapsed time, byte size, and product count (or fail with a clear timeout error)
