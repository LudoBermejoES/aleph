import { BaseBoxShapeTool } from 'tldraw'

export class RelationshipArrowTool extends BaseBoxShapeTool {
  static override id = 'relationshipArrow'
  static override initial = 'idle'
  override shapeType = 'relationshipArrow' as const
}
