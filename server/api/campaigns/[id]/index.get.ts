import { withApiHandler } from '../../../utils/api-handler'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => ({
    ...event.context.campaign,
    role: event.context.campaignRole,
  })),
)
