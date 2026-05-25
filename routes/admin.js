const express=require('express');
const bcrypt=require('bcryptjs');
const{getAllUsers,createUser,updateUserStatus,deleteUser,safeUser,findUserByEmail}=require('../db/database');
const{requireAuth,requireRole}=require('../middleware/auth');
const router=express.Router();
router.use(requireAuth,requireRole('larry'));
router.get('/users',(req,res)=>res.json({users:getAllUsers().map(safeUser)}));
router.post('/users',async(req,res)=>{
  try{const{name,email,password,role,company,clientId}=req.body;
  if(!name||!email||!password||!role)return res.status(400).json({error:'Name, email, password, and role are required.'});
  if(!['larry','handler','client','partner'].includes(role))return res.status(400).json({error:'Invalid role.'});
  if(password.length<8)return res.status(400).json({error:'Password must be at least 8 characters.'});
  if(findUserByEmail(email))return res.status(409).json({error:'Email already in use.'});
  const passwordHash=await bcrypt.hash(password,12);
  const user=createUser({name,email,passwordHash,role,company,clientId,status:'active'});
  return res.status(201).json({success:true,user:safeUser(user)});}
  catch(err){console.error(err);return res.status(500).json({error:'Server error.'});}});
router.patch('/users/:id/status',(req,res)=>{
  const{status}=req.body;if(!['active','inactive'].includes(status))return res.status(400).json({error:'Invalid status.'});
  const user=updateUserStatus(req.params.id,status);if(!user)return res.status(404).json({error:'User not found.'});
  return res.json({success:true,user:safeUser(user)});});
router.delete('/users/:id',(req,res)=>{
  if(req.params.id===req.user.id)return res.status(400).json({error:'Cannot delete your own account.'});
  deleteUser(req.params.id);return res.json({success:true});});
module.exports=router;