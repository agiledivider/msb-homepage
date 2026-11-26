import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

/**
 * The search field (S5.17), after the styleguide's "Formulare" (2026-11):
 * a box in Feld with a 1 px Feld-Rand border, 6 px corners, 44 px high,
 * 16 px text; hover border Text leise, focus the 3 px ring at 2 px. The label
 * is always visible above the field; the placeholder is only an example.
 * `end` holds what sits at the right end (a key hint, like the app search).
 */
export function SearchField({
  id,
  label,
  end,
  inputRef,
  ...input
}: {
  id: string
  label: string
  end?: ReactNode
  inputRef?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>) {
  return (
    <div className="grid min-w-0 gap-[5px]">
      <label htmlFor={id} className="font-sans text-[14px] font-bold leading-[1.3] text-ink">
        {label}
      </label>
      <div className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-[6px] border border-feld-rand bg-feld pl-3 pr-2 transition-colors hover:border-muted focus-within:border-brand-text focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-text focus-within:outline-solid">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-11 min-w-0 flex-1 bg-transparent font-sans text-[16px] text-ink outline-none placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          {...input}
        />
        {end}
      </div>
    </div>
  )
}

/** A key name drawn like a key cap, for the hints at the end of the field. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden shrink-0 rounded-[4px] border border-line bg-fond px-1.5 font-mono text-[14px] leading-6 text-muted md:inline-block">
      {children}
    </kbd>
  )
}
