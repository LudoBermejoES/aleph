<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('auth.signIn') }}</CardTitle>
      <CardDescription>{{ $t('auth.signInDescription') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">{{ $t('auth.email') }}</label>
          <Input id="email" v-model="form.email" type="email" placeholder="dm@example.com" required />
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">{{ $t('auth.password') }}</label>
          <Input id="password" v-model="form.password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? $t('auth.signingIn') : $t('auth.signIn') }}
        </Button>
      </form>
      <p class="text-center text-sm text-muted-foreground mt-4">
        {{ $t('auth.noAccount') }}
        <NuxtLink to="/register" class="text-primary underline">{{ $t('auth.register') }}</NuxtLink>
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// Components auto-imported by Nuxt from app/components/
import { authSignIn } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authSignIn(form.email, form.password)
    // Full reload to pick up the session cookie
    window.location.href = '/'
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || t('auth.invalidCredentials')
  } finally {
    loading.value = false
  }
}
</script>
