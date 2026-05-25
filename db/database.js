const fs=require('fs');const path=require('path');const DB_PATH=path.join(__dirname,'data.json');
function initDB(){if(!fs.existsSync(DB_PATH)){fs.writeFileSync(DB_PATH,JSON.stringify({users:[],sessions:[]},null,2));}}
function readDB(){try{return JSON.parse(fs.readFileSync(DB_PATH,'utf8'));}catch{return{users:[],sessions:[]};}}
function writeDB(data){fs.writeFileSync(DB_PATH,JSON.stringify(data,null,2));}
function getAllUsers(){return readDB().users;}
function findUserByEmail(email){return readDB().users.find(u=>u.email.toLowerCase()===email.toLowerCase())||null;}
function findUserById(id){return readDB().users.find(u=>u.id===id)||null;}
function createUser({name,email,passwordHash,role,company,clientId,status}){
  const db=readDB();const u={id:'usr_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,email:email.toLowerCase(),passwordHash,role,company:company||null,clientId:clientId||null,status:status||'active',createdAt:new Date().toISOString(),lastLogin:null};
  db.users.push(u);writeDB(db);return u;}
function updateLastLogin(id){const db=readDB();const u=db.users.find(u=>u.id===id);if(u){u.lastLogin=new Date().toISOString();writeDB(db);}}
function updateUserStatus(id,status){const db=readDB();const u=db.users.find(u=>u.id===id);if(u){u.status=status;writeDB(db);return u;}return null;}
function deleteUser(id){const db=readDB();db.users=db.users.filter(u=>u.id!==id);writeDB(db);}
function safeUser(user){if(!user)return null;const{passwordHash,...safe}=user;return safe;}
module.exports={initDB,getAllUsers,findUserByEmail,findUserById,createUser,updateLastLogin,updateUserStatus,deleteUser,safeUser};