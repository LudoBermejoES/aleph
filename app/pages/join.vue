<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('join.title') }}</CardTitle>
      <CardDescription>{{ $t('join.subtitle') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Missing params error -->
      <div v-if="missingParams" class="text-sm text-destructive">
        {{ $t('join.missingParams') }}
      </div>

      <!-- Joining in progress (authenticated user) -->
      <div v-else-if="joining" class="text-sm text-muted-foreground">
        {{ $t('join.joining') }}
      </div>

      <!-- Error state -->
      <div v-else-if="joinError" class="text-sm text-destructive">
        {{ joinError }}
      </div>

      <!-- Auth tabs for unauthenticated users -->
      <div v-else>
        <div class="flex gap-1 mb-6 border-b border-border">
          <button
            @click="activeTab = 'login'"
            :class="['px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'login' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground']">
            {{ $t('join.loginTab') }}
          </button>
          <button
            @click="activeTab = 'register'"
            :class="['px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'register' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground']">
            {{ $t('join.registerTab') }}
          </button>
        </div>

        <!-- Login tab -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label for="login-email" class="text-sm font-medium">{{ $t('auth.email') }}</label>
            <Input id="login-email" v-model="loginForm.email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="space-y-2">
            <label for="login-password" class="text-sm font-medium">{{ $t('auth.password') }}</label>
            <Input id="login-password" v-model="loginForm.password" type="password" placeholder="••••••••" required />
          </div>
          <p v-if="authError" class="text-sm text-destructive">{{ authError }}</p>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? $t('join.joining') : $t('auth.signIn') }}
          </Button>
        </form>

        <!-- Register tab -->
        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-2">
            <label for="reg-name" class="text-sm font-medium">{{ $t('auth.name') }}</label>
            <Input id="reg-name" v-model="registerForm.name" type="text" placeholder="Your name" required />
          </div>
          <div class="space-y-2">
            <label for="reg-email" class="text-sm font-medium">{{ $t('auth.email') }}</label>
            <Input id="reg-email" v-model="registerForm.email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="space-y-2">
            <label for="reg-password" class="text-sm font-medium">{{ $t('auth.password') }}</label>
            <Input id="reg-password" v-model="registerForm.password" type="password" placeholder="••••••••" required minlength="8" />
          </div>
          <p v-if="authError" class="text-sm text-destructive">{{ authError }}</p>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? $t('join.joining') : $t('auth.createAccount') }}
          </Button>
        </form>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { authSignIn, authSignUp } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { t } = useI18n()

const token = route.query.token as string | undefined
const campaignId = route.query.campaign as string | undefined

const missingParams = !token || !campaignId
const joining = ref(false)
const joinError = ref('')
const activeTab = ref('login')
const loading = ref(false)
const authError = ref('')

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', password: '' })

async function joinCampaign() {
  joining.value = true
  joinError.value = ''
  try {
    await $fetch(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token },
      credentials: 'include',
    })
    navigateTo(`/campaigns/${campaignId}`)
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    if (status === 409) {
      // Already a member — redirect anyway
      navigateTo(`/campaigns/${campaignId}`)
      return
    }
    if (status === 410) {
      joinError.value = t('join.errorExpired')
    } else {
      joinError.value = t('join.errorInvalid')
    }
  } finally {
    joining.value = false
  }
}

async function handleLogin() {
  authError.value = ''
  loading.value = true
  try {
    await authSignIn(loginForm.email, loginForm.password)
    await joinCampaign()
  } catch (e: any) {
    authError.value = e?.data?.message || t('auth.invalidCredentials')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  authError.value = ''
  loading.value = true
  try {
    await authSignUp(registerForm.name, registerForm.email, registerForm.password)
    await joinCampaign()
  } catch (e: any) {
    authError.value = e?.data?.message || t('auth.registrationFailed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (missingParams) return
  // Check if already authenticated
  try {
    const res = await fetch('/api/auth/get-session', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (data?.session) {
        await joinCampaign()
      }
    }
  } catch {
    // Not authenticated — show auth tabs
  }
})
</script>
