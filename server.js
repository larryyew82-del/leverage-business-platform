// server.js — Leverage Business Platform
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDB, createUser, findUserByEmail } = require('./db/database');
const { requireAuth, requireRole, optionalAuth } = require('./middleware/auth');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

initDB();

async function seedDefaultUsers() {
  const defaults = [
    { name: 'Larry', email: 'larry@leveragebusiness.my', password: 'Larry@Admin2026', role: 'larry', company: 'Leverage Business Sdn Bhd', clientId: null },
    { name: 'Sarah Tan', email: 'sarah@leveragebusiness.my', password: 'Handler@2026', role: 'handler', company: 'Leverage Business Sdn Bhd', clientId: null },
    { name: 'Chen Ming', email: 'chen@yifengoptical.com', password: 'Client@2026', role: 'client', company: 'Yifeng Optical Sdn Bhd', clientId: 'LB-2026-0047' },
    { name: 'JB Compliance Admin', email: 'admin@jbcompliance.com.my', password: 'Partner@2026', role: 'partner', company: 'JB Compliance Sdn Bhd', clientId: null }
  ];
  for (const u of defaults) {
    if (!findUserByEmail(u.email)) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      createUser({ name: u.name, email: u.email, passwordHash, role: u.role, company: u.company, clientId: u.clientId, status: 'active' });
      console.log('  ✓ Created: ' + u.email + ' (' + u.role + ')');
    }
  }
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Public homepage — redirect if already logged in
app.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    const map = { larry: '/admin', handler: '/handler', client: '/portal', partner: '/partner' };
    return res.redirect(map[req.user.role] || '/portal');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page — always show login, never auto-redirect
// User can manually go to their dashboard if already logged in
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


// Why sequence matters subpage
app.get('/why-sequence-matters', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'why-sequence-matters.html'));
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Protected dashboards
app.get('/portal', requireAuth, requireRole('client'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});
app.get('/handler', requireAuth, requireRole('handler', 'larry'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'handler.html'));
});
app.get('/admin', requireAuth, requireRole('larry'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/partner', requireAuth, requireRole('partner', 'larry'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

seedDefaultUsers().then(() => {
  app.listen(PORT, () => {
    console.log('\n  Leverage Business Platform');
    console.log('  Running at http://localhost:' + PORT);
    console.log('\n  larry@leveragebusiness.my   / Larry@Admin2026   → /admin');
    console.log('  sarah@leveragebusiness.my   / Handler@2026      → /handler');
    console.log('  chen@yifengoptical.com      / Client@2026       → /portal');
    console.log('  admin@jbcompliance.com.my   / Partner@2026      → /partner\n');
  });
});
