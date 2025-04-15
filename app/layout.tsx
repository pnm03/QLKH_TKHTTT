import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from './context/ThemeContext'
import AuthRefreshScript from './components/AuthRefreshScript'
import { Suspense } from 'react'
import { ToastContainer } from 'react-toastify'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QLBH System',
  description: 'Hệ thống quản lý bán hàng',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Arvo" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <Suspense>
            {children}
          </Suspense>
          <AuthRefreshScript />
          <ToastContainer 
            position="top-right" 
            autoClose={5000} 
            hideProgressBar={false} 
            newestOnTop 
            closeOnClick 
            rtl={false} 
            pauseOnFocusLoss 
            draggable 
            pauseOnHover
            theme="light" />
        </ThemeProvider>
      </body>
    </html>
  )
}
