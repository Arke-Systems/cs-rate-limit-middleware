import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import TimePeriod from './TimePeriod.js';

const shortDelay = 10;
const longDelay = 1500;

beforeAll(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.clearAllTimers();
});

test('available requests should be allowed without delay', async () => {
	// Arrange
	const timePeriod = TimePeriod.forScope(randomUUID());
	timePeriod.limit = 10;
	timePeriod.remaining = 10;

	// Act
	const task = createTestTask(timePeriod);
	await vi.advanceTimersByTimeAsync(shortDelay);

	// Assert
	expect(task.completed).toBe(true);
});

test('should delay when remaining requests are exhausted', async () => {
	// Arrange
	const timePeriod = TimePeriod.forScope(randomUUID());
	timePeriod.limit = 1;
	timePeriod.remaining = 0;

	// Act
	const task = createTestTask(timePeriod);
	await vi.advanceTimersByTimeAsync(shortDelay);

	// Assert
	expect(task.completed).toBe(false);
});

test('waiting for availability should consume availability', () => {
	// Arrange
	const timePeriod = TimePeriod.forScope(randomUUID());
	timePeriod.limit = 1;
	timePeriod.remaining = 1;

	// Act
	void timePeriod.waitForAvailability();

	// Assert
	expect(timePeriod.remaining).toBe(0);
});

test('should reset remaining requests after the time period', async () => {
	// Arrange
	const timePeriod = TimePeriod.forScope(randomUUID());
	timePeriod.limit = 5;
	timePeriod.remaining = 1;

	// Act
	void timePeriod.waitForAvailability();
	await vi.advanceTimersByTimeAsync(longDelay);

	// Assert
	expect(timePeriod.remaining).toBe(timePeriod.limit);
});

test('should handle multiple simultaneous requests correctly', async () => {
	// Arrange
	const timePeriod = TimePeriod.forScope(randomUUID());
	timePeriod.limit = 2;
	timePeriod.remaining = 2;

	// Act
	const firstRequest = createTestTask(timePeriod);
	const secondRequest = createTestTask(timePeriod);
	const thirdRequest = createTestTask(timePeriod);
	await vi.advanceTimersByTimeAsync(shortDelay);

	// Assert
	expect(timePeriod.remaining).toBe(0);
	expect(firstRequest.completed).toBe(true);
	expect(secondRequest.completed).toBe(true);
	expect(thirdRequest.completed).toBe(false);

	// Act
	await vi.advanceTimersByTimeAsync(longDelay);

	// Assert
	expect(timePeriod.remaining).toBe(1);
	expect(thirdRequest.completed).toBe(true);

	// Act
	await vi.advanceTimersByTimeAsync(longDelay);
	expect(timePeriod.remaining).toBe(timePeriod.limit);
});

const createTestTask = (timePeriod: TimePeriod) => {
	let completed = false;

	void timePeriod.waitForAvailability().then(() => {
		completed = true;
	});

	return {
		get completed() {
			return completed;
		},
	};
};
