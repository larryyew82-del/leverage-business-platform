const jwt=require('jsonwebtoken');
const{findUserById,safeUser}=require('../db/database');
const JWT_SECRET=process.env.JWT_SECRET||'leverage-jwt-secret-change-in-production';
function generateToken(userId){return jwt.sign({userId},JWT_SECRET,{expiresIn:'24h'});}
function verifyToken(token){try{return jwt.verify(token,JWT_SECRET);}catch{return null;}}
function requireAuth(req,res,next){const token=req.cookies?.token||req.headers.authorization?.replace('Bearer ','');if(!token)return res.redirect('/login');const decoded=verifyToken(token);if(!decoded)return res.redirect('/login');const user=findUserById(decoded.userId);if(!user||user.status!=='active')return res.redirect('/login');req.user=safeUser(user);next();}
function requireRole(...roles){return(req,res,next)=>{if(!req.user)return res.redirect('/login');if(!roles.includes(req.user.role))return res.status(403).send('Access denied');next();};}
function optionalAuth(req,res,next){const token=req.cookies?.token;if(token){const decoded=verifyToken(token);if(decoded){const user=findUserById(decoded.userId);if(user&&user.status==='active')req.user=safeUser(user);}}next();}
module.exports={generateToken,verifyToken,requireAuth,requireRole,optionalAuth};