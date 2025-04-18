'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DebugCategoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableInfo, setTableInfo] = useState<any>(null)
  const [createResult, setCreateResult] = useState<any>(null)
  
  // Check tables
  const checkTables = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/check-tables')
      const data = await response.json()
      
      setTableInfo(data)
      console.log('Table info:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error checking tables')
      console.error('Error checking tables:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Create category table
  const createCategoryTable = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/create-category')
      const data = await response.json()
      
      setCreateResult(data)
      console.log('Create result:', data)
      
      // Refresh table info
      await checkTables()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating category table')
      console.error('Error creating category table:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Test direct query
  const testDirectQuery = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClientComponentClient()
      
      // Try lowercase
      const { data: lowercaseData, error: lowercaseError } = await supabase
        .from('category')
        .select('*')
        .limit(5)
      
      // Try uppercase
      const { data: uppercaseData, error: uppercaseError } = await supabase
        .from('Category')
        .select('*')
        .limit(5)
      
      console.log('Direct query results:')
      console.log('Lowercase category:', { data: lowercaseData, error: lowercaseError })
      console.log('Uppercase Category:', { data: uppercaseData, error: uppercaseError })
      
      setCreateResult({
        lowercase: {
          success: !lowercaseError,
          data: lowercaseData,
          error: lowercaseError
        },
        uppercase: {
          success: !uppercaseError,
          data: uppercaseData,
          error: uppercaseError
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error testing direct query')
      console.error('Error testing direct query:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    checkTables()
  }, [])
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Category Table</h1>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <button 
            onClick={checkTables}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Check Tables
          </button>
          
          <button 
            onClick={createCategoryTable}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Create Category Table
          </button>
          
          <button 
            onClick={testDirectQuery}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test Direct Query
          </button>
        </div>
        
        {loading && <p className="text-gray-500">Loading...</p>}
        
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {tableInfo && (
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="text-xl font-bold mb-2">Table Information</h2>
            <pre className="whitespace-pre-wrap overflow-auto max-h-60">
              {JSON.stringify(tableInfo, null, 2)}
            </pre>
          </div>
        )}
        
        {createResult && (
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="text-xl font-bold mb-2">Create/Query Result</h2>
            <pre className="whitespace-pre-wrap overflow-auto max-h-60">
              {JSON.stringify(createResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}