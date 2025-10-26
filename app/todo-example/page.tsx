import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  // ✅ Thêm await cho cookies()
  const cookieStore = await cookies()
  // ✅ Thêm await cho createClient()
  const supabase = await createClient(cookieStore)

  // ✅ Đổi từ 'todos' sang 'Category' (bảng có trong database)
  const { data: categories, error } = await supabase
    .from('Category')
    .select('*')
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Danh sách Danh mục Sản phẩm</h1>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">❌ Lỗi: {error.message}</p>
          </div>
        ) : categories && categories.length > 0 ? (
          <ul className="bg-white shadow rounded-lg divide-y">
            {categories.map((category: any) => (
              <li key={category.category_id} className="p-4">
                <div className="flex items-start gap-4">
                  {category.image_category && (
                    <img 
                      src={category.image_category} 
                      alt={category.name_category}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{category.name_category}</h3>
                    <p className="text-gray-600 text-sm mt-1">{category.description_category}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">⚠️ Không có danh mục nào. Hãy thêm dữ liệu vào database!</p>
            <p className="text-sm text-gray-400 mt-2">
              Chạy SQL trong <code>Note_SQL/FULL_DATABASE_SETUP.sql</code> để tạo database
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 