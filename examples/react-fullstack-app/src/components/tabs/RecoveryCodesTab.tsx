import { useState, useEffect } from 'react';
import '../../styles/Tabs.css';

interface RecoveryCodesTabProps {
  userId: string;
  sessionToken: string;
}

function RecoveryCodesTab({ sessionToken }: RecoveryCodesTabProps) {
  const [codes, setCodes] = useState<string[]>([]);
  const [codeCount, setCodeCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCodeCount();
  }, []);

  const fetchCodeCount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/auth/passkey/recovery/codes/count', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recovery code count');
      }

      const data = await response.json();
      setCodeCount(data.count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCodes = async () => {
    if (codeCount > 0) {
      const confirmed = confirm(
        'You already have recovery codes. Generating new codes will invalidate the old ones. Continue?'
      );
      if (!confirmed) return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/auth/passkey/recovery/codes/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate recovery codes');
      }

      const data = await response.json();
      const codes = data.data?.codes || data.codes || [];
      setCodes(codes);
      setCodeCount(codes.length);
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCodes = () => {
    const text = codes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passkey-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    alert('Recovery codes copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="tab-loading">
        <div className="spinner"></div>
        <p>Loading recovery codes...</p>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <div>
          <h2>Recovery Codes</h2>
          <p className="tab-description">
            Recovery codes allow you to access your account if you lose your passkey.
          </p>
        </div>
        <button 
          onClick={handleGenerateCodes}
          className="primary-button"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="spinner-small"></div>
              Generating...
            </>
          ) : (
            codeCount > 0 ? 'Regenerate Codes' : 'Generate Codes'
          )}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
          <button onClick={fetchCodeCount} className="error-retry">
            Retry
          </button>
        </div>
      )}

      {codeCount > 0 && codes.length === 0 && (
        <div className="info-box status-box">
          <h3>✅ Recovery Codes Active</h3>
          <p>
            You have <strong>{codeCount} unused recovery codes</strong>.
          </p>
          <p className="note">
            Recovery codes are shown only once when generated. If you've lost them,
            you can regenerate new codes (this will invalidate the old ones).
          </p>
        </div>
      )}

      {codes.length > 0 && (
        <div className="recovery-codes-container">
          <div className="warning-box">
            <h3>⚠️ Important: Save These Codes</h3>
            <p>
              These codes are shown <strong>only once</strong>. Store them in a safe place.
              Each code can be used only once.
            </p>
          </div>

          <div className="codes-display">
            <div className="codes-grid">
              {codes.map((code, index) => (
                <div key={index} className="code-item">
                  <span className="code-number">{index + 1}</span>
                  <code className="code-value">{code}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="codes-actions">
            <button onClick={handleDownloadCodes} className="secondary-button">
              📥 Download as Text
            </button>
            <button onClick={handleCopyCodes} className="secondary-button">
              📋 Copy to Clipboard
            </button>
          </div>

          <div className="info-box">
            <h4>How to Use Recovery Codes</h4>
            <ol>
              <li>If you lose access to your passkey, click "Use Recovery Code" on the sign-in page</li>
              <li>Enter your email and one of these codes</li>
              <li>You'll be signed in and can register a new passkey</li>
              <li>Each code can only be used once</li>
            </ol>
          </div>
        </div>
      )}

      {codeCount === 0 && codes.length === 0 && (
        <div className="empty-state">
          <h3>🔢 No Recovery Codes Yet</h3>
          <p>
            Recovery codes are a backup authentication method. Generate them now to ensure
            you can always access your account, even if you lose your passkey.
          </p>
          <button 
            onClick={handleGenerateCodes}
            className="primary-button"
            disabled={isGenerating}
          >
            Generate Recovery Codes
          </button>
        </div>
      )}

      <div className="info-box">
        <h4>💡 Best Practices</h4>
        <ul>
          <li><strong>Store securely:</strong> Keep codes in a password manager or secure location</li>
          <li><strong>Don't share:</strong> Anyone with a code can access your account</li>
          <li><strong>Regenerate if compromised:</strong> If you think codes are exposed, generate new ones</li>
          <li><strong>One-time use:</strong> Each code works only once</li>
        </ul>
      </div>
    </div>
  );
}

export default RecoveryCodesTab;

