import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 second',
  retry: {
    maximumAttempts: 3,
  },
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  try {
    return await verifyEmail(email)
  } catch (error) {
    // Activity timed out or failed after retries; treat as unverified instead of hanging/throwing.
    return false
  }
}
