# Rate Limit Middleware

Contentstack imposes [rate limits][2] on the Content Management API.

These limits are imposed on a _per-organization_ basis; therefore, these limits
are shared across all developers, services (such as CI/CD), applications
(such as live sites), and stacks.

This project provides middleware for [openapi-fetch][1] that monitors the
rate limit headers provided by Contentstack and provides a delay/retry
mechanism to handle rate limiting.

## Installation

```bash
yarn add @arke-systems/rate-limit-middleware
```

## Usage

Add this middleware to your `openapi-fetch` client:

```ts
import createClient from "openapi-fetch";
import RateLimitMiddleware from "@arke-systems/rate-limit-middleware";
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
  new RateLimitMiddleware({
    maxRetries: 5,
    scope: "my-organization",
  }),
);
```

## Events

The middleware emits events that can be used to monitor the rate limiting
behavior:

- `rate-limit-exceeded`: Emitted when the rate limit has been exceeded, and
  all retry attempts have been exhausted.

[1]: https://openapi-ts.pages.dev/openapi-fetch/ "openapi-fetch"
[2]: https://www.contentstack.com/docs/developers/apis/content-management-api#rate-limiting "Rate Limiting"
