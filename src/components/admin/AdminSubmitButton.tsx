'use client'
import { useFormStatus } from 'react-dom'
import { SubmitButtonLabel } from './SubmitButtonLabel'

/** A submit button for a plain (non-useActionState) server-action form — pending
 *  comes from useFormStatus, which only works inside the <form> it submits, hence
 *  this being its own client component rather than inline in the row markup. */
export function AdminSubmitButton({
  label,
  pendingLabel,
  className,
  disabled,
  spinnerSize,
  ariaLabel,
}: {
  label: string
  pendingLabel: string
  className: string
  disabled?: boolean
  spinnerSize?: number
  ariaLabel?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={disabled || pending} aria-label={ariaLabel} className={className}>
      <SubmitButtonLabel pending={pending} label={label} pendingLabel={pendingLabel} spinnerSize={spinnerSize} />
    </button>
  )
}
