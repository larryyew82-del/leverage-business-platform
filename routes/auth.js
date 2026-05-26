// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { findUserByEmail, createUser, updateLastLogin, safeUser } = require('../db/database');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limit login attempts — 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = findUserByEmail(email.trim());
    if (!user) {
      // Same response as wrong password — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is not active. Please contact Leverage Business.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    updateLastLogin(user.id);

    const token = generateToken(user.id);

    // Set HTTP-only cookie — 24 hours
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Return user info + redirect path based on role
    const redirectMap = {
      larry:   '/admin',
      handler: '/handler',
      client:  '/portal',
      partner: '/partner'
    };

    return res.json({
      success: true,
      user: safeUser(user),
      redirect: redirectMap[user.role] || '/portal'
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, redirect: '/login' });
});

// ── GET /api/auth/me — current user info
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// ── POST /api/auth/register — Larry-only: create new accounts
// In production this would be called from the admin panel
router.post('/register', requireAuth, async (req, res) => {
  try {
    // Only Larry can create new accounts
    if (req.user.role !== 'larry') {
      return res.status(403).json({ error: 'Only the administrator can create accounts.' });
    }

    const { name, email, password, role, company, clientId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const validRoles = ['larry', 'handler', 'client', 'partner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: larry, handler, client, or partner.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = findUserByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      company: company?.trim() || null,
      clientId: clientId?.trim() || null,
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      user: safeUser(newUser)
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
