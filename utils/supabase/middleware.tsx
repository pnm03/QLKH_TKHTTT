import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieList: { name: string; value: string }[] = [];
          request.cookies.getAll().forEach(cookie => {
            cookieList.push({
              name: cookie.name,
              value: cookie.value,
            });
          });
          return cookieList;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              // Xử lý các cookie quan trọng
              const defaultOptions = {
                sameSite: "lax" as const,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 7, // 1 tuần
                path: "/",
              };
              
              // Tùy chỉnh các options cho cookie auth 
              const mergedOptions = {
                ...defaultOptions,
                ...options,
              };
              
              // Chuẩn hóa httpOnly dựa vào tên cookie
              if (name.includes('access') || name.includes('refresh')) {
                mergedOptions.httpOnly = true;
              }
              
              // Thêm cookie vào request và response
              request.cookies.set({
                name,
                value,
                ...mergedOptions,
              });
              
              response.cookies.set({
                name,
                value,
                ...mergedOptions,
              });
              
              // Log debug thông tin
              console.log(`Cookie middleware đã thiết lập: ${name}`);
            } catch (error) {
              console.error(`Lỗi thiết lập cookie ${name}:`, error);
            }
          });
        },
      },
    }
  );

  return { response, supabase };
}; 