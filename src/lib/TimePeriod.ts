import { setTimeout as delay } from "node:timers/promises";

// Rate limit time period is documented as one second, see:
//
// https://www.contentstack.com
//    /docs/developers/apis/content-management-api#rate-limiting
const timePeriod = 1000;

const timePeriods = new Map<string, TimePeriod>();

export default class TimePeriod implements AsyncDisposable {
	limit = 1;
	remaining = 1;

	#tick: Promise<void> | undefined;
	#resolveTick: (() => void) | undefined;
	#timeout: NodeJS.Timeout | undefined;

	private constructor() {
		// Prevent public instantiation
	}

	public static forScope(scopeId: string) {
		const existing = timePeriods.get(scopeId);

		if (existing) {
			return existing;
		}

		const created = new TimePeriod();
		timePeriods.set(scopeId, created);
		return created;
	}

	public async [Symbol.asyncDispose]() {
		const tick = this.#tick;

		this.remaining = this.limit;
		this.#tick = undefined;
		this.#resolveTick?.();
		clearTimeout(this.#timeout);

		return tick;
	}

	public async waitForAvailability() {
		while (this.remaining <= 0) {
			await (this.#tick ?? delay(timePeriod));
		}

		this.remaining -= 1;

		if (this.#tick) {
			return;
		}

		this.#tick = new Promise<void>((resolve) => {
			this.#resolveTick = resolve;

			this.#timeout = setTimeout(() => {
				this.remaining = this.limit;
				resolve();
				this.#tick = undefined;
				this.#resolveTick = undefined;
			}, timePeriod);
		});
	}
}
