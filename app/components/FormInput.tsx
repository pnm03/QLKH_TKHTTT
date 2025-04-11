'use client'

import React, { forwardRef } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="mb-4">
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          ref={ref}
          className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput 