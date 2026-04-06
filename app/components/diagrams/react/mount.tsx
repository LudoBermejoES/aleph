import React from 'react'
import { createRoot } from 'react-dom/client'
import { TldrawWrapper, type TldrawWrapperProps } from './TldrawWrapper'

export interface MountedCanvas {
  update: (props: TldrawWrapperProps) => void
  unmount: () => void
}

export function mountTldrawCanvas(
  container: HTMLElement,
  props: TldrawWrapperProps,
): MountedCanvas {
  const root = createRoot(container)

  function render(p: TldrawWrapperProps) {
    root.render(React.createElement(TldrawWrapper, p))
  }

  render(props)

  return {
    update: render,
    unmount: () => root.unmount(),
  }
}
