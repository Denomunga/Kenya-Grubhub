# 🔐 Encryption Key Setup Guide

## Current Implementation

The encryption system uses `process.env.MESSAGE_ENCRYPTION_KEY` with a fallback default value. **You MUST set a secure encryption key for production use.**

## How to Set Up Your Encryption Key

### 1. Generate a Secure Encryption Key

**Option A: Generate a random 256-bit key (Recommended)**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL (if installed)
openssl rand -base64 32

# Using PowerShell (Windows)
Add-Type -AssemblyName System.Web; [System.Web.Security.Membership]::GeneratePassword(32, 4)
```

**Option B: Use an online generator (for development only)**
- Visit: https://randomkeygen.com/
- Generate a 256-bit (32 character) key
- Example: `bXlfc3VwZXJfc2VjcmV0X2VuY3J5cHRpb25fa2V5XzEyMzQ1Njc4OTA=`

### 2. Set Environment Variables

**For Server (.env file)**
```bash
# In server/.env
MESSAGE_ENCRYPTION_KEY=your-generated-encryption-key-here
```

**For Client (.env file)**
```bash
# In client/.env
VITE_MESSAGE_ENCRYPTION_KEY=your-generated-encryption-key-here
```

### 3. Example Setup

Here's a complete example using a generated key:

```bash
# Generated key: bXlfc3VwZXJfc2VjcmV0X2VuY3J5cHRpb25fa2V5XzEyMzQ1Njc4OTA=

# Server .env
MESSAGE_ENCRYPTION_KEY=bXlfc3VwZXJfc2VjcmV0X2VuY3J5cHRpb25fa2V5XzEyMzQ1Njc4OTA=

# Client .env  
VITE_MESSAGE_ENCRYPTION_KEY=bXlfc3VwZXJfc2VjcmV0X2VuY3J5cHRpb25fa2V5XzEyMzQ1Njc4OTA=
```

## 🔒 Security Best Practices

### 1. **NEVER use the default key in production**
The default key `'default-encryption-key-change-in-production'` is insecure and should only be used for development.

### 2. **Use different keys for different environments**
```bash
# Development
MESSAGE_ENCRYPTION_KEY=dev-key-for-testing-only

# Staging  
MESSAGE_ENCRYPTION_KEY=staging-encryption-key-123

# Production
MESSAGE_ENCRYPTION_KEY=super-secure-production-key-456
```

### 3. **Store keys securely**
- Use environment variables (never commit to git)
- Consider using secret management services (AWS Secrets Manager, Azure Key Vault)
- Rotate keys periodically in production

### 4. **Key requirements**
- Minimum 32 characters (256 bits)
- Use Base64 encoding for consistency
- Mix of uppercase, lowercase, numbers, and special characters

## 🚀 Quick Setup Commands

### Generate and Set Key in One Step
```bash
# Generate key and add to .env files
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "MESSAGE_ENCRYPTION_KEY=$ENCRYPTION_KEY" >> server/.env
echo "VITE_MESSAGE_ENCRYPTION_KEY=$ENCRYPTION_KEY" >> client/.env

echo "✅ Encryption key generated and added to .env files"
echo "🔑 Key: $ENCRYPTION_KEY"
```

### Windows PowerShell Version
```powershell
# Generate key
$key = [System.Convert]::ToBase64String((New-Object Security.Cryptography.RijndaelManaged).Key)

# Add to .env files
Add-Content -Path "server\.env" -Value "MESSAGE_ENCRYPTION_KEY=$key"
Add-Content -Path "client\.env" -Value "VITE_MESSAGE_ENCRYPTION_KEY=$key"

Write-Host "✅ Encryption key generated and added to .env files"
Write-Host "🔑 Key: $key"
```

## 🧪 Test Your Setup

After setting up your encryption key, test the system:

```bash
# Restart your server and client
npm run dev

# Test sending messages in the chat
# Messages should encrypt/decrypt properly
```

## 📝 Current Code Location

The encryption key is used in:
- `server/utils/encryption.ts` (line 4)
- `client/src/utils/encryption.ts` (line 4)

Both files use the same pattern:
```typescript
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
```

## ⚠️ Important Notes

1. **Both server and client must use the same key** for encryption/decryption to work
2. **Never commit the actual key to git** - add `.env` to `.gitignore`
3. **Change the key if you suspect it's been compromised**
4. **Backup your encryption key** - if you lose it, encrypted messages cannot be decrypted

## 🔍 Verification

To verify your key is working:
1. Send a test message in the chat
2. Check the database - the message should be encrypted (not readable)
3. The message should appear decrypted in the chat interface
4. Try accessing another user's thread - should be blocked

Your messaging system is now secure with proper encryption! 🛡️
