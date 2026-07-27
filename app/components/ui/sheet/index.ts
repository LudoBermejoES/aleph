import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Sheet } from './Sheet.vue'
export { default as SheetClose } from './SheetClose.vue'
export { default as SheetContent } from './SheetContent.vue'
export { default as SheetDescription } from './SheetDescription.vue'
export { default as SheetFooter } from './SheetFooter.vue'
export { default as SheetHeader } from './SheetHeader.vue'
export { default as SheetTitle } from './SheetTitle.vue'
export { default as SheetTrigger } from './SheetTrigger.vue'

/**
 * A sheet is a Dialog under the hood, so SheetContent is portalled to <body> — outside
 * the layout root div that supplies the app's only `color` declaration. `bg-background`
 * therefore has to be paired with `text-foreground`, or the sheet's content inherits the
 * UA default black onto a themed dark surface (1.06–1.28:1 in the eight dark themes).
 *
 * A caller that swaps the background must swap the foreground with it: `layouts/default.vue`
 * passes `bg-sidebar-background text-sidebar-foreground`, because `--foreground` on
 * `--sidebar-background` is 1.22–1.33:1 in the three LIGHT themes, where the sidebar is the
 * dark surface. tailwind-merge keeps only the caller's token in each pair.
 */
export const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background text-foreground p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

export type SheetVariants = VariantProps<typeof sheetVariants>
