<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-2">Welcome to Aleph</h1>
    <p class="text-muted-foreground mb-8">
      Your self-hosted TTRPG campaign management suite.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Create and manage your campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">No campaigns yet. Create your first one to get started.</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
</script>
