<template>
  <div role="toolbar" :aria-label="$t('aria.forms.characterFilterToolbar')">
    <!-- PC/NPC Toggle + Search -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <Button
        :variant="typeFilter === 'all' ? 'default' : 'outline'"
        size="sm"
        @click="$emit('set-type', 'all')"
        >{{ $t('characters.all') }}</Button
      >
      <Button
        :variant="typeFilter === 'pc' ? 'default' : 'outline'"
        size="sm"
        @click="$emit('set-type', 'pc')"
        >{{ $t('characters.pcs') }}</Button
      >
      <Button
        :variant="typeFilter === 'npc' ? 'default' : 'outline'"
        size="sm"
        @click="$emit('set-type', 'npc')"
        >{{ $t('characters.npcs') }}</Button
      >

      <div class="relative ml-auto">
        <component
          :is="ICONS.search"
          class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        />
        <input
          :value="searchInput"
          type="text"
          :placeholder="$t('characters.searchPlaceholder')"
          class="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary w-56"
          data-testid="character-search"
          @input="$emit('update:searchInput', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2 mb-4" data-testid="filter-bar">
      <select
        :value="statusFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="status-filter"
        :aria-label="$t('aria.filters.characterStatus')"
        @change="
          $emit('update:statusFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.statusAll') }}</option>
        <option value="alive">{{ $t('characters.alive') }}</option>
        <option value="dead">{{ $t('characters.dead') }}</option>
        <option value="missing">{{ $t('characters.missing') }}</option>
        <option value="unknown">{{ $t('characters.unknown') }}</option>
      </select>

      <select
        v-if="races.length"
        :value="raceFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="race-filter"
        @change="
          $emit('update:raceFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.allRaces') }}</option>
        <option v-for="r in races" :key="r" :value="r">{{ r }}</option>
      </select>

      <select
        v-if="classes.length"
        :value="classFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="class-filter"
        @change="
          $emit('update:classFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.allClasses') }}</option>
        <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
      </select>

      <select
        :value="alignmentFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="alignment-filter"
        @change="
          $emit('update:alignmentFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.allAlignments') }}</option>
        <option v-for="a in ALIGNMENTS" :key="a" :value="a">{{ a }}</option>
      </select>

      <select
        v-if="organizations.length"
        :value="orgFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="org-filter"
        @change="
          $emit('update:orgFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.allOrgs') }}</option>
        <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>

      <select
        v-if="locationOptions.length"
        :value="locationFilter"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="location-filter"
        @change="
          $emit('update:locationFilter', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="">{{ $t('characters.allLocations') }}</option>
        <option v-for="l in locationOptions" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>

      <label class="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          :checked="showCompanions"
          type="checkbox"
          class="rounded"
          data-testid="companions-toggle"
          @change="
            $emit('update:showCompanions', ($event.target as HTMLInputElement).checked)
            $emit('filter-change')
          "
        />
        {{ $t('characters.showCompanions') }}
      </label>
    </div>

    <!-- Sort Controls -->
    <div class="flex items-center gap-2 mb-6" data-testid="sort-controls">
      <span class="text-sm text-muted-foreground">{{ $t('characters.sortBy') }}</span>
      <select
        :value="sortField"
        class="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        data-testid="sort-field"
        @change="
          $emit('update:sortField', ($event.target as HTMLSelectElement).value)
          $emit('filter-change')
        "
      >
        <option value="updatedAt">{{ $t('characters.sortUpdatedAt') }}</option>
        <option value="name">{{ $t('characters.sortName') }}</option>
        <option value="status">{{ $t('characters.sortStatus') }}</option>
        <option value="race">{{ $t('characters.sortRace') }}</option>
        <option value="class">{{ $t('characters.sortClass') }}</option>
      </select>
      <Button variant="outline" size="sm" data-testid="sort-dir" @click="$emit('toggle-sort-dir')">
        {{ sortDir === 'asc' ? $t('characters.sortAsc') : $t('characters.sortDesc') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
]

defineProps<{
  typeFilter: string
  searchInput: string
  statusFilter: string
  raceFilter: string
  classFilter: string
  alignmentFilter: string
  orgFilter: string
  locationFilter: string
  showCompanions: boolean
  sortField: string
  sortDir: string
  races: string[]
  classes: string[]
  organizations: { id: string; name: string }[]
  locationOptions: { id: string; name: string }[]
}>()

defineEmits<{
  'set-type': [type: string]
  'update:searchInput': [value: string]
  'update:statusFilter': [value: string]
  'update:raceFilter': [value: string]
  'update:classFilter': [value: string]
  'update:alignmentFilter': [value: string]
  'update:orgFilter': [value: string]
  'update:locationFilter': [value: string]
  'update:showCompanions': [value: boolean]
  'update:sortField': [value: string]
  'toggle-sort-dir': []
  'filter-change': []
}>()
</script>
