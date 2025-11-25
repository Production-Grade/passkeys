# Complete React + Passkeys Example

A **comprehensive, production-ready example** demonstrating **all features** of `@productiongrade/passkeys` in a React application.

## What This Example Demonstrates

This example showcases **every feature** of the library:

### Core Features
- **Passkey Registration** - Create accounts with biometric authentication
- **Passkey Authentication** - Sign in without passwords
- **Session Management** - Simple token-based sessions (in-memory for demo)

### Passkey Management
- **List Passkeys** - View all registered passkeys
- **Update Nicknames** - Give passkeys memorable names
- **Delete Passkeys** - Remove old or compromised passkeys
- **Multiple Passkeys** - Add passkeys for different devices

### Account Recovery
- **Recovery Codes** - Generate and use backup codes
- **Email Recovery** - Password reset via email tokens
- **Recovery Code Count** - Track remaining codes

### Developer Experience
- **Type Safety** - Full TypeScript support
- **Error Handling** - Comprehensive error messages
- **Loading States** - Proper UX feedback
- **React Hooks** - Clean, composable API

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend

```bash
npm run dev:backend
```

The backend will start on `http://localhost:3001` with:
- All passkey endpoints
- Recovery code endpoints
- Email recovery endpoints
- Session management

### 3. Start the Frontend

In a new terminal:

```bash
npm run dev
```

The frontend will open at `http://localhost:5173`

## Using the Example

### Registration Flow
1. Enter your email address
2. Click "Create Passkey"
3. Complete the biometric prompt
4. You're signed in!

### Dashboard Features

#### Passkeys Tab
- View all your registered passkeys
- Add additional passkeys for other devices
- Update passkey nicknames
- Delete old passkeys (must keep at least one)

#### Recovery Codes Tab
- Generate 10 single-use recovery codes
- Download or copy codes for safekeeping
- View remaining code count
- Regenerate codes if needed

#### Email Recovery Tab
- Test the email recovery flow
- Recovery links appear in server console (for demo)
- Verify recovery tokens
- In production, these would be sent via email

## Architecture

### Backend (`server.ts`)

```
Express Server
├── Passkey Routes (from @productiongrade/passkeys/express)
│   ├── POST /api/auth/passkey/register/start
│   ├── POST /api/auth/passkey/register/finish
│   ├── POST /api/auth/passkey/authenticate/start
│   ├── POST /api/auth/passkey/authenticate/finish
│   ├── GET  /api/auth/passkey/passkeys (requires auth)
│   ├── PATCH /api/auth/passkey/passkeys/:id (requires auth)
│   ├── DELETE /api/auth/passkey/passkeys/:id (requires auth)
│   ├── POST /api/auth/passkey/recovery/codes/generate (requires auth)
│   ├── POST /api/auth/passkey/recovery/codes/authenticate
│   ├── GET  /api/auth/passkey/recovery/codes/count (requires auth)
│   ├── POST /api/auth/passkey/recovery/email/initiate
│   └── POST /api/auth/passkey/recovery/email/verify
├── Session Routes
│   ├── GET  /api/session
│   └── POST /api/auth/logout
└── Custom Endpoints (override defaults to add session tokens)
    ├── POST /api/auth/passkey/register/finish (custom)
    └── POST /api/auth/passkey/authenticate/finish (custom)
```

**Session Management:**
- Simple in-memory Map for demo purposes
- Bearer token authentication
- Auto-expires after 24 hours
- Middleware extracts `req.user` from token

### Frontend (`src/`)

```
src/
├── App.tsx                          # Main app with session handling
├── components/
│   ├── AuthPage.tsx                 # Registration & login
│   ├── Dashboard.tsx                # Main dashboard with tabs
│   └── tabs/
│       ├── PasskeyManagementTab.tsx # Manage passkeys
│       ├── RecoveryCodesTab.tsx     # Generate/view codes
│       └── EmailRecoveryTab.tsx     # Test email recovery
└── styles/
    ├── App.css
    ├── AuthPage.css
    ├── Dashboard.css
    └── Tabs.css
```

**React Hooks Used:**
- `usePasskeyRegistration` - Register new passkeys
- `usePasskeyAuth` - Authenticate with passkeys
- `usePasskeyManagement` - List, update, delete passkeys
- `isWebAuthnSupported` - Check browser compatibility
- `formatDate`, `getDeviceTypeLabel` - Utility functions

## Security Notes

### This is a Demo
This example uses **in-memory storage** for simplicity:
- Sessions are stored in a `Map` (lost on restart)
- Passkeys are stored in memory (lost on restart)
- Challenges are stored in memory (lost on restart)

### Production Recommendations
For production, replace with:

**Session Storage:**
- Redis for fast session lookups
- Database with indexed tokens
- JWT with refresh tokens

**Passkey Storage:**
- PostgreSQL with Prisma adapter
- MySQL with custom adapter
- MongoDB with custom adapter

**Challenge Storage:**
- Redis with TTL (recommended)
- Database with cleanup job

## Key Concepts

### Session Flow
1. User registers or authenticates
2. Backend creates session token
3. Frontend stores token in localStorage
4. Token sent as `Authorization: Bearer <token>` header
5. Backend middleware extracts user from token
6. Protected routes check `req.user`

### Recovery Codes
- Generated in sets of 10
- Each code is single-use
- Hashed before storage (bcrypt)
- Can be regenerated (invalidates old codes)
- Used when passkey is lost

### Email Recovery
- User requests recovery via email
- Backend generates secure token (32 bytes)
- Token is hashed (SHA-256) before storage
- Email sent with recovery link
- Token valid for 60 minutes
- Single-use only

## Customization

### Styling
All styles are in `src/styles/`:
- Modify colors, spacing, animations
- Uses CSS variables for easy theming
- Responsive design included

### API URL
Change the API URL in all components:
```typescript
apiUrl: 'http://localhost:3001/api/auth/passkey'
```

### Session Storage
Replace `localStorage` with:
- `sessionStorage` for tab-only sessions
- Secure cookies (httpOnly, sameSite)
- IndexedDB for offline support

## Testing

### Manual Testing Checklist
- [ ] Register new user
- [ ] Sign in with passkey
- [ ] Add additional passkey
- [ ] Update passkey nickname
- [ ] Delete passkey (except last one)
- [ ] Generate recovery codes
- [ ] Download recovery codes
- [ ] Regenerate recovery codes
- [ ] Send recovery email
- [ ] Verify recovery token
- [ ] Sign out
- [ ] Sign in again

### Browser Compatibility
Test in:
- Chrome 67+ (recommended)
- Safari 14+ (recommended)
- Edge 18+
- Firefox 60+

## Troubleshooting

### "Passkeys Not Supported"
- Use a modern browser (Chrome, Safari, Edge)
- Ensure HTTPS (or localhost for dev)
- Check if WebAuthn is enabled

### "Failed to fetch"
- Ensure backend is running on port 3001
- Check CORS settings in `server.ts`
- Verify API URLs in components

### "Authentication required"
- Check if session token is in localStorage
- Verify token is sent in Authorization header
- Check backend session middleware

### Recovery Email Not Sent
- Check server console for recovery link
- In production, configure email service
- Verify email recovery is enabled in config

## Learn More

- **Library Documentation**: See `/docs` in the repository
- **API Reference**: `/docs/api-reference.mdx`
- **Best Practices**: `/docs/best-practices.mdx`

## Contributing

This example is part of the `@productiongrade/passkeys` library. To contribute:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details

---

**Built by Castellan Cyber**

For production-grade implementations and consulting, visit [productiongrade.tech](https://productiongrade.tech)
