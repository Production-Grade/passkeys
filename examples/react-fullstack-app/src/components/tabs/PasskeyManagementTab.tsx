import { useState } from 'react';
import { usePasskeyManagement, usePasskeyRegistration, formatDate, getDeviceTypeLabel } from '@productiongrade/passkeys/react';
import '../../styles/Tabs.css';

interface PasskeyManagementTabProps {
  userId: string;
  userEmail: string;
  sessionToken: string;
}

function PasskeyManagementTab({ userId, userEmail, sessionToken }: PasskeyManagementTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNickname, setNewNickname] = useState('');
  const [showAddPasskey, setShowAddPasskey] = useState(false);

  const management = usePasskeyManagement({
    apiUrl: 'http://localhost:3001/api/auth/passkey',
    authToken: sessionToken,
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const addPasskey = usePasskeyRegistration({
    apiUrl: 'http://localhost:3001/api/auth/passkey',
    onSuccess: () => {
      setShowAddPasskey(false);
      management.refresh();
      alert('New passkey added successfully!');
    },
    onError: (error) => {
      alert(`Failed to add passkey: ${error.message}`);
    },
  });

  const handleUpdateNickname = async (id: string) => {
    if (!newNickname.trim()) {
      alert('Please enter a nickname');
      return;
    }

    await management.updatePasskey(id, { nickname: newNickname });
    setEditingId(null);
    setNewNickname('');
  };

  const handleDelete = async (id: string, nickname?: string) => {
    const confirmMessage = nickname 
      ? `Delete passkey "${nickname}"?`
      : 'Delete this passkey?';
    
    if (confirm(confirmMessage)) {
      await management.deletePasskey(id);
    }
  };

  const handleAddPasskey = async () => {
    try {
      await addPasskey.register({ 
        email: userEmail,
        userId,
      });
    } catch (error: any) {
      alert(`Failed to add passkey: ${error.message}`);
    }
  };

  if (management.isLoading) {
    return (
      <div className="tab-loading">
        <div className="spinner"></div>
        <p>Loading your passkeys...</p>
      </div>
    );
  }

  if (management.error) {
    return (
      <div className="tab-error">
        <h3>⚠️ Error Loading Passkeys</h3>
        <p>{management.error.message}</p>
        <button onClick={() => management.refresh()} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <div>
          <h2>Your Passkeys</h2>
          <p className="tab-description">
            Manage your registered passkeys. You can add multiple passkeys for different devices.
          </p>
        </div>
        <button 
          onClick={() => setShowAddPasskey(!showAddPasskey)}
          className="primary-button"
          disabled={addPasskey.isRegistering}
        >
          {showAddPasskey ? 'Cancel' : '+ Add Passkey'}
        </button>
      </div>

      {showAddPasskey && (
        <div className="add-passkey-box">
          <h3>Add New Passkey</h3>
          <p>Click the button below to register a new passkey for this account.</p>
          <button 
            onClick={handleAddPasskey}
            className="primary-button"
            disabled={addPasskey.isRegistering}
          >
            {addPasskey.isRegistering ? (
              <>
                <div className="spinner-small"></div>
                Creating passkey...
              </>
            ) : (
              'Create New Passkey'
            )}
          </button>
        </div>
      )}

      {management.passkeys.length === 0 ? (
        <div className="empty-state">
          <p>No passkeys found. This shouldn't happen!</p>
        </div>
      ) : (
        <div className="passkeys-list">
          {management.passkeys.map((passkey) => (
            <div key={passkey.id} className="passkey-card">
              <div className="passkey-header">
                <div className="passkey-icon">
                  {getDeviceTypeLabel(passkey.transports)}
                </div>
                <div className="passkey-info">
                  {editingId === passkey.id ? (
                    <div className="edit-nickname">
                      <input
                        type="text"
                        value={newNickname}
                        onChange={(e) => setNewNickname(e.target.value)}
                        placeholder="Enter nickname"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleUpdateNickname(passkey.id)}
                        className="save-button"
                        disabled={management.isUpdating}
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => {
                          setEditingId(null);
                          setNewNickname('');
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3>
                        {passkey.nickname || 'Unnamed Passkey'}
                        <button
                          onClick={() => {
                            setEditingId(passkey.id);
                            setNewNickname(passkey.nickname || '');
                          }}
                          className="edit-icon-button"
                          title="Edit nickname"
                        >
                          ✏️
                        </button>
                      </h3>
                      <p className="passkey-meta">
                        Created {formatDate(passkey.createdAt)}
                        {passkey.lastUsedAt && (
                          <> • Last used {formatDate(passkey.lastUsedAt)}</>
                        )}
                      </p>
                      <p className="passkey-meta">
                        Counter: {passkey.counter} • Backed up: {passkey.backedUp ? 'Yes' : 'No'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="passkey-actions">
                <button
                  onClick={() => handleDelete(passkey.id, passkey.nickname)}
                  className="delete-button"
                  disabled={management.isDeleting || management.passkeys.length === 1}
                  title={management.passkeys.length === 1 ? 'Cannot delete last passkey' : 'Delete passkey'}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="info-box">
        <h4>💡 About Passkeys</h4>
        <ul>
          <li><strong>Multiple devices:</strong> Add a passkey for each device you use</li>
          <li><strong>Nicknames:</strong> Give each passkey a memorable name</li>
          <li><strong>Last passkey:</strong> You must keep at least one passkey</li>
          <li><strong>Backed up:</strong> iCloud/Google Password Manager synced passkeys</li>
        </ul>
      </div>
    </div>
  );
}

export default PasskeyManagementTab;

