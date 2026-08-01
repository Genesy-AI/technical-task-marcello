import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callOrionConnect, callAstraDialer, callNimbusLookup } from './phoneProviders'

const input = {
    fullName: 'Ada Lovelace',
    companyWebsite: 'example.com',
    email: 'ada@example.com',
    jobTitle: 'Engineer',
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok,
            status,
            json: async () => body,
        })
    )
}

describe('phoneProviders', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    describe('callOrionConnect', () => {
        it('passes through a found phone', async () => {
            mockFetchOnce({ phone: '+1-555-0100' })
            const result = await callOrionConnect(input)
            expect(result).toEqual({ phone: '+1-555-0100' })
        })

        it('returns null when no phone found', async () => {
            mockFetchOnce({ phone: null })
            const result = await callOrionConnect(input)
            expect(result).toEqual({ phone: null })
        })

        it('throws on a non-ok response so Temporal can retry', async () => {
            mockFetchOnce({}, false, 500)
            await expect(callOrionConnect(input)).rejects.toThrow('Orion Connect responded with status 500')
        })
    })

    describe('callAstraDialer', () => {
        it('normalizes phoneNmbr into phone', async () => {
            mockFetchOnce({ phoneNmbr: '+1-555-0199' })
            const result = await callAstraDialer(input)
            expect(result).toEqual({ phone: '+1-555-0199' })
        })

        it('treats undefined phoneNmbr as not found', async () => {
            mockFetchOnce({ phoneNmbr: undefined })
            const result = await callAstraDialer(input)
            expect(result).toEqual({ phone: null })
        })

        it('treats null phoneNmbr as not found', async () => {
            mockFetchOnce({ phoneNmbr: null })
            const result = await callAstraDialer(input)
            expect(result).toEqual({ phone: null })
        })
    })

    describe('callNimbusLookup', () => {
        it('combines number and countryCode with a + prefix when missing', async () => {
            mockFetchOnce({ number: 5550123, countryCode: '34' })
            const result = await callNimbusLookup(input)
            expect(result).toEqual({ phone: '+345550123' })
        })

        it('keeps countryCode as-is when it already has a + prefix', async () => {
            mockFetchOnce({ number: 5550123, countryCode: '+34' })
            const result = await callNimbusLookup(input)
            expect(result).toEqual({ phone: '+345550123' })
        })

        it('returns null when number is missing', async () => {
            mockFetchOnce({ number: null, countryCode: '34' })
            const result = await callNimbusLookup(input)
            expect(result).toEqual({ phone: null })
        })
    })
})
