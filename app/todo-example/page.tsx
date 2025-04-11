import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Danh sách công việc</h1>
        
        {todos && todos.length > 0 ? (
          <ul className="bg-white shadow rounded-lg divide-y">
            {todos.map((todo) => (
              <li key={todo.id} className="p-4 flex items-center justify-between">
                <span className={todo.completed ? 'line-through text-gray-400' : ''}>
                  {todo.title || todo.task || 'Công việc không có tiêu đề'}
                </span>
                <span className="text-sm text-gray-500">
                  {todo.created_at && new Date(todo.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Không có công việc nào. Hãy thêm công việc mới!</p>
          </div>
        )}
      </div>
    </div>
  )
} 