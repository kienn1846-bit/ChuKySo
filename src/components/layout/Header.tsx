import React from 'react';
import {
  ShieldCheck,
  Award,
  Key,
  FileSignature,
  SearchCheck,
  BookOpen,
  Sun,
  Moon,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { DigitalCertificate } from '../../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeCert?: DigitalCertificate;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onResetStorage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeCert,
  theme,
  setTheme,
  onResetStorage,
}) => {
  const navTabs = [
    { id: 'pki', label: 'Chứng thư số & CA', icon: Award },
    { id: 'sign', label: 'Ký số văn bản', icon: FileSignature },
    { id: 'verify', label: 'Xác thực chữ ký', icon: SearchCheck },
    { id: 'lab', label: 'Cơ sở toán học', icon: BookOpen },
  ];

  return (
    <header className="header-bar">
      <div className="header-container">
        {/* Brand Logo & SaaS Tag */}
        <div className="brand-logo" onClick={() => setActiveTab('pki')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="brand-title">
              <span>ChuKySo</span>
            </div>
            <div className="brand-subtitle">
              Nền tảng ký số văn bản điện tử & quản lý chứng thực PKI
            </div>
          </div>
        </div>

        {/* Right side status & controls */}
        <div className="header-actions">
          {activeCert && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.84rem',
              }}
              title={`Chứng thư số của ${activeCert.subject.commonName}`}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <Key size={15} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Người ký hiện tại:</span>
              <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                {activeCert.subject.commonName}
              </strong>
            </div>
          )}

          {/* Reset Demo Data Button */}
          <button
            className="btn btn-outline btn-sm"
            onClick={onResetStorage}
            title="Khôi phục dữ liệu mẫu ban đầu (Reset Demo Data)"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Theme Toggle */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#1c54fe" />}
          </button>
        </div>
      </div>

      {/* Nav Tabs Bar */}
      <div className="nav-tabs-wrapper">
        <div className="nav-tabs-container">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
