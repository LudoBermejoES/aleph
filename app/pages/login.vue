<template>
  <Card>
    <CardHeader>
      <CardTitle>Sign In</CardTitle>
      <CardDescription>Enter your credentials to access your campaigns</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">Email</label>
          <Input id="email" v-model="form.email" type="email" placeholder="dm@example.com" required />
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <Input id="password" v-model="form.password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </Button>
      </form>
      <p class="text-center text-sm text-muted-foreground mt-4">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary underline">Register</NuxtLink>
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// Components auto-imported by Nuxt from app/components/
import { authSignIn } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })

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
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>
