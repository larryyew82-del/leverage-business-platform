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
      console.log('  Created: ' + u.email);
    }
  }
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    const map = { larry: '/admin', handler: '/handler', client: '/portal', partner: '/partner' };
    return res.redirect(map[req.user.role] || '/portal');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', optionalAuth, (req, res) => {
  if (req.user) {
    const map = { larry: '/admin', handler: '/handler', client: '/portal', partner: '/partner' };
    return res.redirect(map[req.user.role] || '/portal');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/login'); });
app.get('/portal', requireAuth, requireRole('client'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'portal.html')));
app.get('/handler', requireAuth, requireRole('handler', 'larry'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'handler.html')));
app.get('/admin', requireAuth, requireRole('larry'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', requireAuth, requireRole('partner', 'larry'), (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

seedDefaultUsers().then(() => {
  app.listen(PORT, () => {
    console.log('\n  Leverage Business Platform running at http://localhost:' + PORT);
    console.log('  larry@leveragebusiness.my / Larry@Admin2026');
    console.log('  sarah@leveragebusiness.my / Handler@2026');
    console.log('  chen@yifengoptical.com    / Client@2026');
    console.log('  admin@jbcompliance.com.my / Partner@2026\n');
  });
});