import { useState } from 'react';
import PasskeyManagementTab from './tabs/PasskeyManagementTab';
import RecoveryCodesTab from './tabs/RecoveryCodesTab';
import EmailRecoveryTab from './tabs/EmailRecoveryTab';
import '../styles/Dashboard.css';

interface User {
  id: string;
  email: string;
}

interface DashboardProps {
  user: User;
  sessionToken: string;
  onLogout: () => void;
}

type Tab = 'passkeys' | 'recovery-codes' | 'email-recovery';

function Dashboard({ user, sessionToken, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('passkeys');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🔐 Passkeys Dashboard</h1>
            <p className="user-email">{user.email}</p>
          </div>
          <button onClick={onLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'passkeys' ? 'active' : ''}`}
            onClick={() => setActiveTab('passkeys')}
          >
            <span className="tab-icon">🔑</span>
            Passkeys
          </button>
          <button
            className={`tab ${activeTab === 'recovery-codes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovery-codes')}
          >
            <span className="tab-icon">🔢</span>
            Recovery Codes
          </button>
          <button
            className={`tab ${activeTab === 'email-recovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('email-recovery')}
          >
            <span className="tab-icon">📧</span>
            Email Recovery
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'passkeys' && (
            <PasskeyManagementTab 
              userId={user.id}
              userEmail={user.email}
              sessionToken={sessionToken}
            />
          )}
          {activeTab === 'recovery-codes' && (
            <RecoveryCodesTab 
              userId={user.id}
              sessionToken={sessionToken}
            />
          )}
          {activeTab === 'email-recovery' && (
            <EmailRecoveryTab 
              email={user.email}
            />
          )}
        </div>
      </div>

      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>
            This example demonstrates <strong>all features</strong> of @productiongrade/passkeys.
            For production patterns, see our{' '}
            <a href="https://github.com/castellan-cyber/passkeys-production-example" target="_blank" rel="noopener noreferrer">
              production example
            </a>.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
