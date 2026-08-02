export type LeadsEnrichPhonesInput = {
    leadIds: number[]
}

export type LeadsEnrichPhonesOutput = {
    success: boolean
    enrichedCount: number
    results: Array<{
        leadId: number
        phoneNumber: string | null
        phoneVerified: boolean
    }>
    skipped: Array<{
        leadId: number
        leadName: string
    }>
    errors: Array<{
        leadId: number
        leadName: string
        error: string
    }>
}
