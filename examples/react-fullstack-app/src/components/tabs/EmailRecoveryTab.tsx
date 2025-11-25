import { useState } from 'react';
import '../../styles/Tabs.css';

interface EmailRecoveryTabProps {
  email: string;
}

function EmailRecoveryTab({ email }: EmailRecoveryTabProps) {
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSendRecoveryEmail = async () => {
    try {
      setIsSending(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/auth/passkey/recovery/email/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send recovery email');
      }

      setEmailSent(true);
      alert('Recovery email sent! Check the server console for the recovery link.');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!recoveryToken.trim()) {
      alert('Please enter the recovery token');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/auth/passkey/recovery/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: recoveryToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Invalid or expired token');
      }

      const data = await response.json();
      alert(`✅ Token verified! User ID: ${data.userId}\n\nIn a real app, you would now be signed in and prompted to register a new passkey.`);
      
      // Reset form
      setEmailSent(false);
      setRecoveryToken('');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <div>
          <h2>Email Recovery</h2>
          <p className="tab-description">
            Test the email recovery flow. In this demo, recovery links are shown in the server console.
          </p>
        </div>
      </div>

      <div className="email-recovery-container">
        <div className="info-box">
          <h3>📧 How Email Recovery Works</h3>
          <ol>
            <li>Click "Send Recovery Email" to initiate the recovery process</li>
            <li>Check the <strong>server console</strong> for the recovery link (in production, this would be sent via email)</li>
            <li>Copy the token from the URL and paste it below</li>
            <li>Click "Verify Token" to complete the recovery</li>
          </ol>
        </div>

        <div className="recovery-form">
          <div className="form-section">
            <h3>Step 1: Send Recovery Email</h3>
            <p>Your email: <strong>{email}</strong></p>
            <button
              onClick={handleSendRecoveryEmail}
              className="primary-button"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <div className="spinner-small"></div>
                  Sending...
                </>
              ) : (
                '📧 Send Recovery Email'
              )}
            </button>
            {emailSent && (
              <div className="success-box">
                ✅ Recovery email sent! Check the server console for the recovery link.
              </div>
            )}
          </div>

          {emailSent && (
            <div className="form-section">
              <h3>Step 2: Verify Recovery Token</h3>
              <p>Copy the token from the server console and paste it here:</p>
              <div className="form-group">
                <label htmlFor="recovery-token">Recovery Token</label>
                <input
                  id="recovery-token"
                  type="text"
                  value={recoveryToken}
                  onChange={(e) => setRecoveryToken(e.target.value)}
                  placeholder="Paste the recovery token here"
                  className="token-input"
                />
              </div>
              <button
                onClick={handleVerifyToken}
                className="primary-button"
                disabled={isVerifying || !recoveryToken.trim()}
              >
                {isVerifying ? (
                  <>
                    <div className="spinner-small"></div>
                    Verifying...
                  </>
                ) : (
                  '✅ Verify Token'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="info-box">
          <h4>💡 In Production</h4>
          <p>
            In a production environment, the recovery link would be sent via email using a service like:
          </p>
          <ul>
            <li><strong>SendGrid</strong> - Transactional email API</li>
            <li><strong>AWS SES</strong> - Amazon's email service</li>
            <li><strong>Postmark</strong> - Developer-friendly email</li>
            <li><strong>Mailgun</strong> - Email automation</li>
          </ul>
          <p>
            The recovery token is valid for 60 minutes and can only be used once.
          </p>
        </div>

        <div className="warning-box">
          <h4>⚠️ Security Considerations</h4>
          <ul>
            <li>Recovery tokens are single-use and expire after 60 minutes</li>
            <li>Tokens are hashed before storage (SHA-256)</li>
            <li>Email recovery should require additional verification in high-security contexts</li>
            <li>Consider rate-limiting recovery requests to prevent abuse</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EmailRecoveryTab;


