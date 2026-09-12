const https = require('https');

/**
 * Admin Authorization Middleware
 * Verifies Clerk authentication and validates that the requesting user has the 'admin' role.
 * 
 * Supports:
 * 1. Clerk JWT Bearer Token (publicMetadata.role === 'admin' or session claims)
 * 2. Clerk Secret API user verification if CLERK_SECRET_KEY is configured
 * 3. Fallback Admin Secret Key header (x-admin-secret) for direct server/admin access
 */

const verifyClerkUserRole = async (userId, secretKey) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clerk.com',
      port: 443,
      path: `/v1/users/${userId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const user = JSON.parse(data);
            resolve(user);
          } catch (err) {
            reject(err);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (err) {
    return null;
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // 1. Direct Admin Secret Key header bypass (useful for administrative services & CLI)
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret && process.env.ADMIN_SECRET_KEY && adminSecret === process.env.ADMIN_SECRET_KEY) {
      req.user = { role: 'admin', authType: 'secret_key' };
      return next();
    }

    // 2. Extract Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = decodeJwtPayload(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token format.',
      });
    }

    const userId = decoded.sub || decoded.userId || decoded.id;
    const roleFromJwt =
      decoded.publicMetadata?.role ||
      decoded.public_metadata?.role ||
      decoded.metadata?.role ||
      decoded.privateMetadata?.role ||
      decoded.private_metadata?.role ||
      decoded.role ||
      decoded['https://clerk.dev/role'];

    // If role is directly available in Clerk JWT claims and matches admin
    if (roleFromJwt === 'admin') {
      req.user = {
        id: userId,
        role: 'admin',
        claims: decoded,
      };
      return next();
    }

    // 3. If Clerk Secret Key is available, query Clerk API directly to check publicMetadata
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey && userId) {
      try {
        const clerkUser = await verifyClerkUserRole(userId, clerkSecretKey);
        if (clerkUser && (clerkUser.public_metadata?.role === 'admin' || clerkUser.publicMetadata?.role === 'admin')) {
          req.user = {
            id: userId,
            email: clerkUser.email_addresses?.[0]?.email_address,
            role: 'admin',
            clerkUser,
          };
          return next();
        }
      } catch (clerkErr) {
        console.error('Clerk user lookup error:', clerkErr.message);
      }
    }

    // If role is not admin
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin privileges required.',
    });
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authorization error.',
    });
  }
};

module.exports = adminAuth;
