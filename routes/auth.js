const express=require('express');
const bcrypt=require('bcryptjs');
const rateLimit=require('express-rate-limit');
const{findUserByEmail,createUser,updateLastLogin,safeUser}=require('../db/database');
const{generateToken,requireAuth}=require('../middleware/auth');
const router=express.Router();
const loginLimiter=rateLimit({windowMs:15*60*1000,max:10,message:{error:'Too many login attempts. Please try again in 15 minutes.'}});
router.post('/login',loginLimiter,async(req,res)=>{
  try{const{email,password}=req.body;
  if(!email||!password)return res.status(400).json({error:'Email and password are required.'});
  const user=findUserByEmail(email.trim());
  if(!user)return res.status(401).json({error:'Invalid email or password.'});
  if(user.status!=='active')return res.status(403).json({error:'Your account is not active.'});
  const ok=await bcrypt.compare(password,user.passwordHash);
  if(!ok)return res.status(401).json({error:'Invalid email or password.'});
  updateLastLogin(user.id);
  const token=generateToken(user.id);
  res.cookie('token',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:24*60*60*1000});
  const map={larry:'/admin',handler:'/handler',client:'/portal',partner:'/partner'};
  return res.json({success:true,user:safeUser(user),redirect:map[user.role]||'/portal'});}
  catch(err){console.error(err);return res.status(500).json({error:'Server error.'});}});
router.post('/logout',(req,res)=>{res.clearCookie('token');return res.json({success:true,redirect:'/login'});});
router.get('/me',requireAuth,(req,res)=>res.json({user:req.user}));
module.exports=router;