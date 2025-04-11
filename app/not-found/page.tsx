'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './styles.css';
import { createClient } from '@/utils/supabase/client';

export default function NotFound() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Lỗi kiểm tra phiên đăng nhập:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const handleGoBack = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };
  
  return (
    <section className="page_404">
      <div className="container">
        <div className="row">
          <div className="col-sm-12">
            <div className="col-sm-10 col-sm-offset-1 text-center">
              <div className="four_zero_four_bg">
                <h1 className="text-center">404</h1>
              </div>
              
              <div className="contant_box_404">
                <h3 className="h2">
                  Có vẻ như bạn đã bị lạc
                </h3>
                
                <p>Trang bạn đang tìm kiếm không tồn tại!</p>
                
                <button 
                  onClick={handleGoBack} 
                  className="link_404"
                  disabled={loading}
                >
                  {loading ? 'Đang kiểm tra...' : isAuthenticated ? 'Quay về Dashboard' : 'Quay về Trang chủ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 