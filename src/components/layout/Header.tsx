import React from 'react';
import {
  ShieldCheck,
  Award,
  Key,
  FileSignature,
  SearchCheck,
  FlaskConical,
  BookOpen,
  Sun,
  Moon,
  RotateCcw,
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
    { id: 'lab', label: 'Phòng TN toán', icon: FlaskConical },
  ];

  return (
    <header className="header-bar">
      <div className="header-container">
        {/* Brand */}
        <div className="brand-logo" onClick={() => setActiveTab('pki')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="brand-title">
              <span>SignWCert</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                ElGamal PKI v1.0
              </span>
            </div>
            <div className="brand-subtitle">
              Hệ thống ký số văn bản ElGamal & quản lý chứng thực PKI
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
                padding: '6px 12px',
                background: 'var(--bg-input)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
              }}
            >
              <Key size={14} color="var(--accent-cyan)" />
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Người ký hiện tại: </span>
                <strong style={{ color: 'var(--text-main)' }}>{activeCert.subject.commonName}</strong>
              </div>
            </div>
          )}

          {/* Reset Demo Data Button - subtle icon-only */}
          <button
            className="btn btn-outline btn-sm"
            onClick={onResetStorage}
            title="Khôi phục dữ liệu mẫu ban đầu (Reset Demo)"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Theme Toggle */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
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
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
