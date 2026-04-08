import express from 'express';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

// Lazy initialization of Auth0 JWT verification middleware
let checkJwtInstance: any = null;

function getCheckJwt() {
  if (!checkJwtInstance) {
    const domain = process.env.AUTH0_DOMAIN;
    const audience = process.env.AUTH0_AUDIENCE;
    
    if (!domain || !audience) {
      console.error('❌ Auth0 configuration missing:', { domain: !!domain, audience: !!audience });
      throw new Error('Auth0 not configured: AUTH0_DOMAIN and AUTH0_AUDIENCE required');
    }
    
    const jwksUri = `https://${domain}/.well-known/jwks.json`;
    console.log('🔧 Initializing Auth0 JWT middleware:', { domain, audience, jwksUri });
    
    checkJwtInstance = expressjwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri
      }),
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256']
    });
  }
  return checkJwtInstance;
}

// Middleware wrapper that ensures Auth0 is configured
const checkJwt = (req: any, res: any, next: any) => {
  try {
    const middleware = getCheckJwt();
    return middleware(req, res, next);
  } catch (error: any) {
    console.error('❌ Auth0 middleware error:', error.message);
    return res.status(500).json({ error: 'Auth0 not configured', message: error.message });
  }
};

// Sync Auth0 user with your database
router.post('/sync-auth0', checkJwt, async (req: any, res: express.Response) => {
  try {
    const { auth0Id, email, name, avatar } = req.body;
    
    // Validate required fields
    if (!auth0Id || !email || !name) {
      return res.status(400).json({ 
        error: 'Missing required user information from Auth0' 
      });
    }
    
    // Find or create user
    let user = await User.findOne({ auth0Id: auth0Id });
    
    if (!user) {
      // Check if user exists with email (for migration)
      user = await User.findOne({ email });
      
      if (user) {
        // Update existing user with auth0Id
        user.auth0Id = auth0Id;
        user.avatar = avatar;
        user.emailVerified = true; // Auth0 emails are verified
        await user.save();
      } else {
        // Create new user
        try {
          user = await User.create({
            auth0Id: auth0Id,
            email,
            name,
            avatar: avatar,
            emailVerified: true,
            role: 'user',
            username: email.split('@')[0], // Generate username from email
            password: 'auth0-user-no-password' // Placeholder password
          });
        } catch (createError: any) {
          // Handle duplicate username or email
          if (createError.code === 11000) {
            const field = Object.keys(createError.keyPattern)[0];
            return res.status(400).json({ 
              error: `${field} already exists` 
            });
          }
          throw createError;
        }
      }
    } else {
      // Update user info if changed
      user.name = name;
      user.avatar = avatar;
      user.emailVerified = true; // Ensure email is marked as verified
      await user.save();
    }
    
    // Issue a custom JWT so requireAuth middleware works for all API routes
    const appToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Create session for Auth0 user
    req.session.userId = user._id.toString();
    
    // Save session and return response
    req.session.save((err: any) => {
      if (err) {
        console.error('Session save error for Auth0 user:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.json({ 
        success: true,
        token: appToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username,
          avatar: user.avatar,
          phone: user.phone,
          phoneVerified: user.phoneVerified,
          jobTitle: user.jobTitle
        }
      });
    });
  } catch (error: any) {
    console.error('Auth0 sync error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Invalid user data', 
        details: error.message 
      });
    }
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export { router as auth0Router };
