# Rate Limiting Middleware for Contentstack Rest API Applications

Contentstack imposes [rate limits][2] on the Content Management API.

These limits are imposed on a _per-organization_ basis; therefore, these limits
are shared across all developers, services (such as CI/CD), applications
(such as live sites), and stacks.

This project provides middleware for [openapi-fetch][1] that monitors the
rate limit headers provided by Contentstack and provides a delay/retry
mechanism to handle rate limiting.

Note: the rate limiter has no knowledge of any external activities that may
also be impacting the rate limit. It is very possible to still exceed the
rate limit if other developers or services are also making requests to the
same organization. This middlware makes a best-effort at throttling its own
requests and at retrying requests that are rate-limited, but consuming code
must still expect to encounter an occasional 429: Too Many Requests status.

You can mitigate this by setting `maxRetries` to `Infinity`, but that just
creates a new problem: the middleware will continue to retry requests
indefinitely, which may not be desirable.

## Installation

```bash
yarn add @arke-systems/cs-rate-limit-middleware
```

## Usage

Add this middleware to your `openapi-fetch` client:

```ts
import createClient from "openapi-fetch";
import RateLimitMiddleware from "@arke-systems/cs-rate-limit-middleware";
import type { paths } from "./cma-openapi-3.yaml";

const client = createClient<paths>({
  baseUrl: "...region-specific base URL...",
  headers: {
    api_key: "...stack API key...",
    authorization: "...management token...",
  },
});

client.use(new RateLimitMiddleware());
```

All requests made using `client` will now respect the rate limits. When the
rate limit is exceeded, the request will automatically be retryed after the
rate limit resets. If the maximum number of retry attempts is reached, the
middleware will emit a `rate-limit-exceeded` event, and return the response
as-is. Consuming code must still handle the 429: Too Many Requests status code
in this case.

### Clearing the Timeout

Because the middleware uses `setTimeout` to delay the retry, it is possible
for the middleware to keep an active timer after the Node event loop has
otherwise halted. This may affect short-running applications, such as scripts,
where it may introduce a delay in the application's exit.

This can be mitigated by clearing the timeout when the application is shutting
down. The middleware uses the `Disposable` interface to provide this
functionality:

```ts
// The timeout will be cleared once `rateLimitMiddleware` is out of scope!
// Suitable for applications that manage the client near the top-level.
await using rateLimitMiddleware = new RateLimitMiddleware();
client.use(rateLimitMiddleware);
```

Or

```ts
// The timeout will be cleared once `rateLimitMiddleware` is disposed!
// Suitable for applications that manage the client more dynamically.
const rateLimitMiddleware = new RateLimitMiddleware();
client.use(rateLimitMiddleware);
await rateLimitMiddleware[Symbol.asyncDispose]();
```

## Options

The `RateLimitMiddleware` constructor accepts an options object with the
following optional properties:

- `maxRetries`: The maximum number of retries to make before giving up.
  Defaults to 10.

- `scope`: The scope of the rate limit. To deal with applications that may be
  making requests in multiple organizations, the middleware can be configured
  to track rate limits on a per-organization basis. This is an arbitrary value,
  but should be unique to the target organization.

```ts
client.use(
  new RateLimitMiddleware({ maxRetries: 5, scope: "my-organization" }),
);
```

## Events

The middleware emits events that can be used to monitor the rate limiting
behavior:

- `rate-limit-exceeded`: Emitted when the rate limit has been exceeded, and
  all retry attempts have been exhausted.

- `rate-limit-encountered`: Emitted when the rate limit has been exceeded, but
  the request will be retried.

[1]: https://openapi-ts.pages.dev/openapi-fetch/ "openapi-fetch"
[2]: https://www.contentstack.com/docs/developers/apis/content-management-api#rate-limiting "Rate Limiting"
