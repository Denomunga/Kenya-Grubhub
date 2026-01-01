import express from 'express';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { User } from '../models/User';

const router = express.Router();

// Verify Auth0 tokens
const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Sync Auth0 user with your database
router.post('/sync-auth0', checkJwt, async (req: any, res: express.Response) => {
  try {
    const { sub, email, name, picture } = req.auth;
    
    // Validate required fields
    if (!sub || !email || !name) {
      return res.status(400).json({ 
        error: 'Missing required user information from Auth0' 
      });
    }
    
    // Find or create user
    let user = await User.findOne({ auth0Id: sub });
    
    if (!user) {
      // Check if user exists with email (for migration)
      user = await User.findOne({ email });
      
      if (user) {
        // Update existing user with auth0Id
        user.auth0Id = sub;
        user.avatar = picture;
        user.emailVerified = true; // Auth0 emails are verified
        await user.save();
      } else {
        // Create new user
        try {
          user = await User.create({
            auth0Id: sub,
            email,
            name,
            avatar: picture,
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
      user.avatar = picture;
      user.emailVerified = true; // Ensure email is marked as verified
      await user.save();
    }
    
    res.json({ 
      success: true, 
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
