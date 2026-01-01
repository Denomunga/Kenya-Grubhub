# Auth0 Integration Guide

## 🚀 Setup Instructions

### 1. Create Auth0 Account
1. Go to https://auth0.com/ and sign up
2. Create a new tenant (or use default)
3. Navigate to **Applications → Applications**
4. Click **Create Application**
5. Choose **Single Page Web Applications**
6. Name it "Kenya GrubHub"

### 2. Configure Application Settings
In your Auth0 Application settings:

**Allowed Callback URLs:**
```
http://localhost:5173
https://yourdomain.com
```

**Allowed Logout URLs:**
```
http://localhost:5173
https://yourdomain.com
```

**Allowed Web Origins:**
```
http://localhost:5173
https://yourdomain.com
```

### 3. Enable Social Connections
Navigate to **Authentication → Social** and enable:
- **Google** - Get credentials from Google Cloud Console
- **GitHub** - Get credentials from GitHub OAuth Apps

### 4. Environment Variables
Copy the values from your Auth0 dashboard to your `.env` file:

```bash
# Client-side (client/.env)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/

# Server-side (server/.env)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/
```

### 5. Update User Model
Make sure your User model includes the auth0Id field:

```javascript
// In server/models/User.js
const userSchema = new mongoose.Schema({
  // ... existing fields
  auth0Id: { type: String, sparse: true }, // For Auth0 users
  // ... rest of your fields
});
```

## 🎯 How It Works

### **Hybrid Authentication**
- **Existing Users**: Continue using email/password login
- **New Users**: Can choose social login OR email/password
- **Social Login**: Automatically syncs with your database
- **Security**: All existing security features preserved

### **User Flow**
1. User clicks "Continue with Google/GitHub"
2. Redirected to Auth0 for authentication
3. Auth0 redirects back with token
4. Frontend syncs user with your backend
5. User is logged in and redirected appropriately

### **Data Syncing**
- Auth0 users are created/updated in your database
- Email is verified automatically
- Role defaults to "user" (admin can change later)
- Profile picture is imported from social provider

## 🔒 Security Features Preserved

✅ **CSRF Protection** - Still active for all requests
✅ **Session Management** - Existing sessions work unchanged  
✅ **Role-based Access** - Admin/Staff/User roles maintained
✅ **Email Validation** - Social emails are pre-verified
✅ **Password Policies** - Still enforced for email registration

## 🚨 Important Notes

### **No Breaking Changes**
- All existing functionality works exactly as before
- Existing users can still login with email/password
- All routes and permissions remain the same
- Database schema is extended, not replaced

### **Gradual Migration**
- Users can choose between login methods
- Social login is optional, not required
- You can enable/disable providers anytime
- Existing user data is preserved

### **Testing**
1. Start with Google login (most common)
2. Test GitHub login for technical users
3. Verify role-based redirects work
4. Check that existing email login still works

## 🎉 Benefits

### **For Users**
- One-click social login
- No password to remember
- Email automatically verified
- Profile picture imported

### **For You**
- Reduced registration friction
- Higher conversion rates
- Legitimate email addresses only
- Enterprise-grade security

### **For Business**
- Professional login experience
- Reduced support requests
- Better user analytics
- GDPR compliant authentication

## 🛠 Troubleshooting

### **Common Issues**

**"Callback URL mismatch"**
- Check your Auth0 application settings
- Ensure exact match with your frontend URL

**"Social login not working"**
- Verify social connections are enabled
- Check API keys are correct
- Ensure CORS is configured

**"User not created in database"**
- Check server logs for sync errors
- Verify User model has auth0Id field
- Check database connection

### **Getting Help**
1. Check browser console for errors
2. Review Auth0 dashboard logs
3. Check server logs for sync errors
4. Verify environment variables are set

Your existing authentication system is now enhanced with social login! 🎉
