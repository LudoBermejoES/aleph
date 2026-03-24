<template>
  <Card>
    <CardHeader>
      <CardTitle>Create Account</CardTitle>
      <CardDescription>Register to start managing your campaigns</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium">Name</label>
          <Input id="name" v-model="form.name" type="text" placeholder="Your name" required />
        </div>
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">Email</label>
          <Input id="email" v-model="form.email" type="email" placeholder="dm@example.com" required />
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <Input id="password" v-model="form.password" type="password" placeholder="••••••••" required minlength="8" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </Button>
      </form>
      <p class="text-center text-sm text-muted-foreground mt-4">
        Already have an account?
        <NuxtLink to="/login" class="text-primary underline">Sign in</NuxtLink>
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: 'auth' })

const form = reactive({ name: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: form.name, email: form.email, password: form.password },
    })
    navigateTo('/')
  } catch (e: any) {
    error.value = e.data?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
