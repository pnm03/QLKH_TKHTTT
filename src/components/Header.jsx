import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Header.css';

export default function Header() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const menus = [
    { name: 'dashboard', submenus: ['overview', 'reports'] },
    { name: 'products', submenus: ['list', 'categories'] },
    { name: 'orders', submenus: ['pending', 'history'] },
  ];

  return (
    <header className="dashboard-header">
      {/* Top Row */}
      <div className="top-row">
        <div className="logo-section">
          <img src="/logo.png" alt="Logo" className="logo" />
        </div>
        
        <div className="settings-section">
          <select 
            onChange={(e) => changeLanguage(e.target.value)}
            className="language-selector"
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
          
          <div className="profile-dropdown">
            <button className="profile-button">
              <span className="user-name">Nguyễn Văn A</span>
              <img src="/user-avatar.png" alt="Profile" className="user-avatar" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Row */}
      <nav className="nav-row">
        {menus.map((menu) => (
          <div 
            key={menu.name}
            className={`nav-item ${activeMenu === menu.name ? 'active' : ''}`}

          >
            <button 
              className="nav-main-button"
              onClick={() => {
                setActiveMenu(menu.name);
                setOpenSubmenu(openSubmenu === menu.name ? null : menu.name);
              }}
            >
              {t(menu.name)}
            </button>
            
            {openSubmenu === menu.name && (
              <div className="submenu">
                {menu.submenus.map((sub) => (
                  <button 
                    key={sub}
                    className="submenu-item"
                    onClick={() => setActiveMenu(sub)}
                  >
                    {t(sub)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}