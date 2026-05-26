// server.js — Leverage Business Platform
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const zlib = require('zlib');
const { initDB, createUser, findUserByEmail } = require('./db/database');
const { requireAuth, requireRole, optionalAuth } = require('./middleware/auth');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Gzip compression for all responses ──
app.use((req, res, next) => {
  const ae = req.headers['accept-encoding'] || '';
  if (!ae.includes('gzip')) return next();
  const _send = res.send.bind(res);
  res.send = (body) => {
    if (typeof body !== 'string' && !Buffer.isBuffer(body)) return _send(body);
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    const ct = res.getHeader('content-type') || '';
    if (buf.length < 1024 || /image|font|zip|gz/.test(ct)) return _send(body);
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    return _send(zlib.gzipSync(buf));
  };
  next();
});

// ── Static files with caching ──
// HTML: no-cache (so updates are always fresh)
// Assets: cache 1 day
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.match(/\.(js|css|png|jpg|ico|woff2?)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
  }
  next();
});
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
      const passwordHash = await bcrypt.hash(u.password, 10); // 10 rounds for speed
      createUser({ name: u.name, email: u.email, passwordHash, role: u.role, company: u.company, clientId: u.clientId, status: 'active' });
    }
  }
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// ── Public homepage ──
app.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    const map = { larry: '/admin', handler: '/handler', client: '/portal', partner: '/partner' };
    return res.redirect(map[req.user.role] || '/portal');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/why-sequence-matters', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'why-sequence-matters.html'));
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ── Protected dashboards ──
app.get('/portal',  requireAuth, requireRole('client'),                (req, res) => res.sendFile(path.join(__dirname, 'public', 'portal.html')));
app.get('/handler', requireAuth, requireRole('handler', 'larry'),       (req, res) => res.sendFile(path.join(__dirname, 'public', 'handler.html')));
app.get('/admin',   requireAuth, requireRole('larry'),                   (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', requireAuth, requireRole('partner', 'larry'),        (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

function startServer(port) {
  const server = app.listen(port);
  server.on('listening', () => {
    console.log('\n  ╔══════════════════════════════════════════╗');
    console.log('  ║   Leverage Business Platform              ║');
    console.log('  ║   http://localhost:' + port + '                   ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('\n  larry@leveragebusiness.my   / Larry@Admin2026');
    console.log('  sarah@leveragebusiness.my   / Handler@2026');
    console.log('  chen@yifengoptical.com      / Client@2026');
    console.log('  admin@jbcompliance.com.my   / Partner@2026');
    console.log('\n  Press Ctrl+C to stop.\n');
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('  ⚠  Port ' + port + ' busy — trying ' + (port + 1) + '...');
      server.close();
      startServer(port + 1);
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
}

seedDefaultUsers().then(() => startServer(PORT));
