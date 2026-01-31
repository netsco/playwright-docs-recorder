import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
