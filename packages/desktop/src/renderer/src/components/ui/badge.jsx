import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-teal-600 text-white',
        secondary: 'border-transparent bg-slate-700 text-slate-200',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-slate-600 text-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
