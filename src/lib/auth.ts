import jwt from 'jsonwebtoken';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  });
}

// Edge Runtime compatible version
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    console.log('[AUTH] Verifying token with Edge Runtime, secret length:', JWT_SECRET.length);
    const { payload } = await jwtVerify(token, secret);
    console.log('[AUTH] Token verification successful, userId:', payload.userId);
    return payload as JWTPayload;
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Node.js runtime version (for API routes)
export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log('[AUTH] Verifying token with Node.js runtime, secret length:', JWT_SECRET.length);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('[AUTH] Token verification successful, userId:', decoded.userId);
    return decoded;
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper function for API routes to verify JWT and get user
export async function verifyJWT(request: { headers: Headers }): Promise<{ userId: string; username: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    return {
      userId: decoded.userId,
      username: decoded.username
    };
  } catch {
    return null;
  }
}