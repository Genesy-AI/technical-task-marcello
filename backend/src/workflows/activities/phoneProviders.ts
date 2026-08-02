import { RateLimiter } from './rateLimiter'

// Common shape every provider is adapted to, so the workflow doesn't need to know
// about each provider's own request/response format or auth mechanism.
export interface PhoneLookupInput {
    fullName: string
    companyWebsite: string | null
    email: string
    jobTitle: string | null
}

export interface PhoneLookupResult {
    phone: string | null
}

const ORION_CONNECT_URL = 'https://api.enginy.ai/api/tmp/orionConnect'
const ASTRA_DIALER_URL = 'https://api.enginy.ai/api/tmp/astraDialer'
const NIMBUS_LOOKUP_URL = 'https://api.enginy.ai/api/tmp/numbusLookup'

// Effectively unlimited today (providers have no rate limits yet); tighten per-provider once they do.
const orionLimiter = new RateLimiter(1000, 1000)
const astraLimiter = new RateLimiter(1000, 1000)
const nimbusLimiter = new RateLimiter(1000, 1000)

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timeout)
    }
}

export async function callOrionConnect(input: PhoneLookupInput): Promise<PhoneLookupResult> {
    await orionLimiter.acquire()

    const response = await fetchWithTimeout(
        ORION_CONNECT_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-me': process.env.ORION_CONNECT_API_KEY || 'mySecretKey123',
            },
            body: JSON.stringify({
                fullName: input.fullName,
                companyWebsite: input.companyWebsite,
            }),
        },
        7000
    )

    if (!response.ok) {
        throw new Error(`Orion Connect responded with status ${response.status}`)
    }

    const data = (await response.json()) as { phone: string | null }
    return { phone: data.phone || null }
}

export async function callAstraDialer(input: PhoneLookupInput): Promise<PhoneLookupResult> {
    await astraLimiter.acquire()

    const response = await fetchWithTimeout(
        ASTRA_DIALER_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apiKey: process.env.ASTRA_DIALER_API_KEY || '1234jhgf',
            },
            body: JSON.stringify({ email: input.email }),
        },
        3000
    )

    if (!response.ok) {
        throw new Error(`Astra Dialer responded with status ${response.status}`)
    }

    const data = (await response.json()) as { phoneNmbr: string | null | undefined }
    return { phone: data.phoneNmbr || null }
}

export async function callNimbusLookup(input: PhoneLookupInput): Promise<PhoneLookupResult> {
    await nimbusLimiter.acquire()

    const apiKey = process.env.NIMBUS_LOOKUP_API_KEY || '000099998888'
    const url = `${NIMBUS_LOOKUP_URL}?api=${encodeURIComponent(apiKey)}`

    const response = await fetchWithTimeout(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: input.email, jobTitle: input.jobTitle }),
        },
        3000
    )

    if (!response.ok) {
        throw new Error(`Nimbus Lookup responded with status ${response.status}`)
    }

    const data = (await response.json()) as { number: number | null; countryCode: string | null }
    if (data.number === null || data.number === undefined) {
        return { phone: null }
    }

    // countryCode is assumed to be a dial-code prefix (e.g. "+34"); default to "+" if not provided.
    const prefix = data.countryCode ? (data.countryCode.startsWith('+') ? data.countryCode : `+${data.countryCode}`) : '+'
    return { phone: `${prefix}${data.number}` }
}
