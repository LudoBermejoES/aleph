<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('auth.createAccount') }}</CardTitle>
      <CardDescription>{{ $t('auth.createAccountDescription') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium">{{ $t('auth.name') }}</label>
          <Input id="name" v-model="form.name" type="text" placeholder="Your name" required />
        </div>
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">{{ $t('auth.email') }}</label>
          <Input id="email" v-model="form.email" type="email" placeholder="dm@example.com" required />
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">{{ $t('auth.password') }}</label>
          <Input id="password" v-model="form.password" type="password" placeholder="••••••••" required minlength="8" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? $t('auth.creatingAccount') : $t('auth.createAccount') }}
        </Button>
      </form>
      <p class="text-center text-sm text-muted-foreground mt-4">
        {{ $t('auth.haveAccount') }}
        <NuxtLink to="/login" class="text-primary underline">{{ $t('auth.signIn') }}</NuxtLink>
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { authSignUp } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const form = reactive({ name: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await authSignUp(form.name, form.email, form.password)
    window.location.href = '/'
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || t('auth.registrationFailed')
  } finally {
    loading.value = false
  }
}
</script>
