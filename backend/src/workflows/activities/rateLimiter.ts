// Simple in-memory token bucket, process-local only (would need a shared store e.g. Redis across multiple workers).
export class RateLimiter {
    private tokens: number
    private lastRefill: number

    constructor(
        private readonly maxTokens: number,
        private readonly refillIntervalMs: number
    ) {
        this.tokens = maxTokens
        this.lastRefill = Date.now()
    }

    private refill(): void {
        const now = Date.now()
        const elapsed = now - this.lastRefill
        if (elapsed <= 0) return

        const refillAmount = (elapsed / this.refillIntervalMs) * this.maxTokens
        this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount)
        this.lastRefill = now
    }

    async acquire(): Promise<void> {
        for (; ;) {
            this.refill()

            if (this.tokens >= 1) {
                this.tokens -= 1
                return
            }

            const msPerToken = this.refillIntervalMs / this.maxTokens
            await new Promise((resolve) => setTimeout(resolve, msPerToken))
        }
    }
}
