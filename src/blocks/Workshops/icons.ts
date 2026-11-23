/** Tool drawings a workshop card can hang (names + admin labels). JSX-free so the block config can import it. */
export const TOOL_ICONS = ['loetkolben', 'schluessel', 'saege', 'schere', 'spule', 'geodreieck'] as const
export type ToolIconName = (typeof TOOL_ICONS)[number]

export const TOOL_ICON_LABELS: Record<ToolIconName, string> = {
  loetkolben: 'Lötkolben (Elektronik)',
  schluessel: 'Maulschlüssel (Metall)',
  saege: 'Fuchsschwanz (Holz)',
  schere: 'Schere (Textil)',
  spule: 'Filamentspule (3D-Druck)',
  geodreieck: 'Geodreieck (CAD)',
}

export const isToolIcon = (v: unknown): v is ToolIconName => (TOOL_ICONS as readonly unknown[]).includes(v)
