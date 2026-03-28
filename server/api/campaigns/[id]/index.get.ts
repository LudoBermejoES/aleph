export default defineEventHandler(async (event) => {
  return {
    ...event.context.campaign,
    role: event.context.campaignRole,
  }
})
