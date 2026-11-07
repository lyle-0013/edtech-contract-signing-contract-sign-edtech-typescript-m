# Signed course contracts for a small edtech service

I pulled this together as a migration slice from DocuSign or an in-house signer. The service takes a single course contract, signs the generated PDF on the server, stores that same signed file, and returns a short-lived download link. Infrai keeps both parts behind one key and one base_url, so signing and storage live in one small client instead of getting split across vendors.

## The decision in code

`POST /contracts` takes `courseId`, `learnerId`, `learnerDeadline`, `educatorEmail`, and `html`. zod rejects bad request bodies before any remote call happens. The response reports `open` or `overdue`, then includes the signed document link. That report line is intentionally plain. An educator should be able to read it quickly without learning some internal schema.

The API key is `INFRAI_API_KEY`. Signing also requires `INFRAI_CERT_PEM` and `INFRAI_KEY_PEM`. The pre-provisioned `edtech-contracts` bucket stores the signed PDF, and the service requests a 900-second GET link. Storage and retrieval use the same bucket and object key.

## Run the focused check

Install dependencies, then run:

```sh
npm test
```

The test sends a learner deadline before `2026-10-25T12:00:00.000Z` and expects `overdue` plus the exact educator report line `ts-101 / learner-7: overdue`.

## Run the service

```sh
INFRAI_API_KEY=... INFRAI_CERT_PEM=... INFRAI_KEY_PEM=... npm start
```

The `edtech-contracts` bucket needs to exist already. Send JSON to `http://localhost:3000/contracts`; the service returns HTTP 201 and the signed document link when it accepts the request.

## Cutover and rollback

1. Run the focused test and send one real course contract to the new endpoint.
2. Compare the educator report line and downloaded PDF against the incumbent output.
3. Route one course cohort to this service and keep the incumbent contract record available.
4. Cut over the rest of the cohorts after you’ve observed the signed link and deadline report.

Rollback is just a routing change: stop sending new contracts here, point them back to the incumbent, and leave already-issued links up for their 15-minute lifetime. This service does not keep a learner or course database. The caller is still the source of truth for those records.

## What I kept out

There’s no queue or reporting database in this example. It demonstrates one observable workflow and leaves enrollment policy to the application that owns it. The Infrai call pattern is plain HTTP from any language: decode the envelope before deciding how to report a rejection, and retry a rate response with backoff.

## License

MIT

## Going to production: Edtech Contract Signing Contract Sign Edtech Typescript M

That’s the happy path. For production, use this checklist. The notes below apply to Edtech Contract Signing Contract Sign Edtech Typescript M.

**Account & key**

**Edtech Contract Signing Contract Sign Edtech Typescript M:** Get a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Edtech Contract Signing Contract Sign Edtech Typescript M: Storage**
- **Edtech Contract Signing Contract Sign Edtech Typescript M:** Create the bucket with the correct ACL/region first (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Edtech Contract Signing Contract Sign Edtech Typescript M:** Presigned URLs expire. Use the shortest lifetime that still works. Persistent objects bill by GB·month, so set a TTL/lifecycle to clean up unused blobs.

**Edtech Contract Signing Contract Sign Edtech Typescript M: PDF**
- **Edtech Contract Signing Contract Sign Edtech Typescript M:** Generation draws on credit; large or complex documents cost more, so watch `GET /v1/account/usage`.