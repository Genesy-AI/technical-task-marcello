import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'
import type { PhoneLookupInput } from './activities'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 second',
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  return await verifyEmail(email)
}

const retry = { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '1 second' } as const

// Orion Connect is documented as slower than the other two, so it gets a longer timeout.
const { callOrionConnect } = proxyActivities<typeof activities>({
  startToCloseTimeout: '8 seconds',
  retry,
})
const { callAstraDialer, callNimbusLookup } = proxyActivities<typeof activities>({
  startToCloseTimeout: '4 seconds',
  retry,
})

export interface PhoneEnrichmentResult {
  phone: string | null
  source: 'orionConnect' | 'astraDialer' | 'nimbusLookup' | null
}

const PROVIDERS = [
  { name: 'orionConnect', call: callOrionConnect },
  { name: 'astraDialer', call: callAstraDialer },
  { name: 'nimbusLookup', call: callNimbusLookup },
] as const

export async function enrichPhoneWorkflow(input: PhoneLookupInput): Promise<PhoneEnrichmentResult> {
  for (const provider of PROVIDERS) {
    try {
      const { phone } = await provider.call(input)
      if (phone) {
        return { phone, source: provider.name }
      }
    } catch {
      // Provider exhausted its retries; move on to the next one instead of failing the workflow.
    }
  }

  return { phone: null, source: null }
}
