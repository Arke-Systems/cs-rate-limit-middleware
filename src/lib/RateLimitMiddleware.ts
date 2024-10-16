import EventEmitter from "node:events";
import TimePeriod from "./TimePeriod.js";
import parseValue from "./parseValue.js";

const defaultMaxRetries = 10;
const tooManyRequests = 429;

export default class RateLimitMiddleware extends EventEmitter<{
	"rate-limit-encountered": [Request, Response];
	"rate-limit-exceeded": [Request, Response];
}> {
	readonly #timePeriod: TimePeriod;
	readonly #maxRetries: number;

	public constructor(
		opts: {
			readonly maxRetries?: number;
			readonly scope?: string;
		} = {},
	) {
		super();
		this.#timePeriod = TimePeriod.forScope(opts.scope ?? "default");
		this.#maxRetries = opts.maxRetries ?? defaultMaxRetries;
	}

	public async onRequest() {
		await this.#timePeriod.waitForAvailability();
	}

	public async onResponse(o: { request: Request; response: Response }) {
		let { response } = o;
		let retries = 0;

		this.#updateRateLimit(response.headers);

		while (response.status === tooManyRequests) {
			if (retries >= this.#maxRetries) {
				this.emit("rate-limit-exceeded", o.request, response);
				// The expected behavior here is that the caller will be responsible
				// for handling the 429 status code.
				break;
			}

			this.emit("rate-limit-encountered", o.request, response);
			retries++;
			await this.#timePeriod.waitForAvailability();
			response = await fetch(o.request.clone());
		}

		return response;
	}

	#updateRateLimit(headers: Headers) {
		const remaining = parseValue(headers.get("X-RateLimit-Remaining"));
		const limit = parseValue(headers.get("X-RateLimit-Limit"));

		if (remaining !== null) {
			this.#timePeriod.remaining = remaining;
		}

		if (limit !== null) {
			this.#timePeriod.limit = limit;
		}
	}
}
