import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../app/components/layout/SidebarNav.vue'), 'utf-8')

describe('SidebarNav', () => {
  it('renders app name and subtitle', () => {
    expect(source).toContain("layout.appName")
    expect(source).toContain("layout.appSubtitle")
  })

  it('renders dashboard link when campaignId is provided', () => {
    expect(source).toContain("layout.dashboard")
    expect(source).toContain('v-if="campaignId"')
  })

  it('renders allCampaigns link', () => {
    expect(source).toContain("layout.allCampaigns")
  })

  it('renders nav groups via campaignLinkGroups prop', () => {
    expect(source).toContain('v-for="group in campaignLinkGroups"')
  })

  it('renders nav links inside open groups', () => {
    expect(source).toContain('v-for="link in group.links"')
  })

  it('renders user name and sign-out button', () => {
    expect(source).toContain("auth.signOut")
    expect(source).toContain("$emit('logout')")
  })

  it('emits toggleGroup when group header is clicked', () => {
    expect(source).toContain("emit('toggleGroup', id)")
  })

  it('has settings link', () => {
    expect(source).toContain("settings.title")
    expect(source).toContain('to="/settings"')
  })
})
