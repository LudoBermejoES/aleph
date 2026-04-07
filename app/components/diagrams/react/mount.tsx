import React, { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { TldrawWrapper, type TldrawWrapperProps, type TldrawWrapperHandle } from './TldrawWrapper'

export interface MountedCanvas {
  update: (props: TldrawWrapperProps) => void
  unmount: () => void
  importTldrJson: (json: string) => void
}

export function mountTldrawCanvas(
  container: HTMLElement,
  props: TldrawWrapperProps,
): MountedCanvas {
  const root = createRoot(container)
  const handleRef = createRef<TldrawWrapperHandle>()

  function render(p: TldrawWrapperProps) {
    root.render(
      React.createElement(TldrawWrapper as React.FC<TldrawWrapperProps>, { ...p, handleRef }),
    )
  }

  render(props)

  return {
    update: render,
    unmount: () => root.unmount(),
    importTldrJson: (json: string) => handleRef.current?.importTldrJson(json),
  }
}
