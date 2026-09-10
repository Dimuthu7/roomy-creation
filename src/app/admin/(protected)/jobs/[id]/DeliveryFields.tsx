'use client'
import { useState } from 'react'

/** The amount is kept mounted-or-not but its value is held here, so unticking,
 *  typing, re-ticking and unticking again does not lose what was typed. The server
 *  discards the amount whenever freeDelivery is set, so a stale value cannot leak
 *  into a total — see jobDetailsFormSchema. `onChange` is optional and unused by the
 *  DeliveryFields.test.tsx suite — JobEditor passes it to feed the live totals
 *  preview; nothing else about the component's own behaviour depends on it. */
export function DeliveryFields({
  freeDelivery: initialFree,
  deliveryCharge: initialCharge,
  onChange,
}: {
  freeDelivery: boolean
  deliveryCharge: string
  onChange?: (state: { freeDelivery: boolean; deliveryCharge: string }) => void
}) {
  const [free, setFree] = useState(initialFree)
  const [charge, setCharge] = useState(initialCharge)

  function setFreeAndNotify(next: boolean) {
    setFree(next)
    onChange?.({ freeDelivery: next, deliveryCharge: charge })
  }

  function setChargeAndNotify(next: string) {
    setCharge(next)
    onChange?.({ freeDelivery: free, deliveryCharge: next })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="freeDelivery"
          checked={free}
          onChange={(e) => setFreeAndNotify(e.target.checked)}
          className="size-4 accent-navy"
        />
        <span className="u-mono text-sm">Free delivery</span>
      </label>

      {free ? null : (
        <label className="block">
          <span className="u-mono text-sm opacity-70">Delivery charge</span>
          <input
            type="text"
            name="deliveryCharge"
            value={charge}
            onChange={(e) => setChargeAndNotify(e.target.value)}
            inputMode="decimal"
            placeholder="5,000.00"
            className="mt-1 block w-full border-2 border-navy bg-paper px-3 py-2"
          />
        </label>
      )}
    </div>
  )
}
