const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const port = process.env.PORT || 3000;

// PostgreSQL pool
let pool;
try {
  const { Pool } = require('pg');
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mesalab',
    max: 10,
    idleTimeoutMillis: 30000
  });
} catch (e) {
  console.warn('pg module not available. DB features will be disabled. Install with: npm install pg');
}

// Auth utilities (JWT + bcrypt)
let jwt;
let bcrypt;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
try{
  jwt = require('jsonwebtoken');
}catch(e){
  console.warn('jsonwebtoken not installed. Install with: npm install jsonwebtoken');
}
try{
  bcrypt = require('bcrypt');
}catch(e){
  console.warn('bcrypt not installed. Install with: npm install bcrypt');
}

async function authenticateToken(req){
  try{
    if(!jwt) return null;
    const header = req.headers['authorization'] || '';
    const parts = header.split(' ');
    if(parts.length!==2 || parts[0] !== 'Bearer') return null;
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET);
    // payload should contain { userId, role }
    return payload;
  }catch(e){
    return null;
  }
}

const mime = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon'
};

function sendJSON(res, status, obj){
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function handleApi(req, res){
  const url = new URL(req.url, `http://localhost:${port}`);
  if(url.pathname === '/api/health' && req.method === 'GET'){
    if(pool){
      try{
        const r = await pool.query('SELECT now() as now');
        return sendJSON(res,200,{ok:true, time: r.rows[0].now});
      }catch(err){
        return sendJSON(res,500,{ok:false,error:err.message});
      }
    }
    return sendJSON(res,200,{ok:true,message:'DB not configured (pg missing)'});
  }

  // LOGIN: POST /api/login  { email, password }
  if(url.pathname === '/api/login' && req.method === 'POST'){
    if(!pool) return sendJSON(res,501,{ok:false,error:'DB not available'});
    let body=''; for await (const c of req) body += c;
    try{
      const { email, password } = JSON.parse(body);
      if(!email || !password) return sendJSON(res,400,{ok:false,error:'email y password requeridos'});
      const q = 'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 LIMIT 1';
      const r = await pool.query(q,[email]);
      if(r.rowCount===0) return sendJSON(res,401,{ok:false,error:'credenciales inválidas'});
      const user = r.rows[0];
      let passMatch = false;
      if(bcrypt && user.password_hash){
        passMatch = await bcrypt.compare(password, user.password_hash);
      } else {
        passMatch = (password === user.password_hash);
      }
      if(!passMatch) return sendJSON(res,401,{ok:false,error:'credenciales inválidas'});
      if(!jwt) return sendJSON(res,501,{ok:false,error:'JWT no disponible (instalar jsonwebtoken)'});
      const payload = { userId: user.id, role: user.role || 'usuario', email: user.email };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
      return sendJSON(res,200,{ok:true, token, user: {id:user.id, email:user.email, name:user.name, role:user.role}});
    }catch(err){
      return sendJSON(res,500,{ok:false,error:err.message});
    }
  }

  if(url.pathname.startsWith('/api/solicitudes')){
    // requerir autenticación
    const auth = await authenticateToken(req);
    if(!auth) return sendJSON(res,401,{ok:false,error:'No autorizado'});

    // GET /api/solicitudes -> admin: todas, usuario: solo propias
    if(req.method === 'GET' && url.pathname === '/api/solicitudes'){
      if(!pool) return sendJSON(res,501,{ok:false,error:'DB not available'});
      try{
        let q = 'SELECT id,user_id,nombre,correo,asunto,prioridad,descripcion,fecha FROM solicitudes';
        let vals = [];
        if(auth.role !== 'admin'){
          q += ' WHERE user_id = $1'; vals = [auth.userId];
        }
        q += ' ORDER BY fecha DESC LIMIT 500';
        const r = await pool.query(q, vals);
        return sendJSON(res,200,{ok:true, data:r.rows});
      }catch(err){
        return sendJSON(res,500,{ok:false,error:err.message});
      }
    }

    // POST /api/solicitudes -> crear solicitud asociada al usuario autenticado
    if(req.method === 'POST' && url.pathname === '/api/solicitudes'){
      if(!pool) return sendJSON(res,501,{ok:false,error:'DB not available'});
      let body = '';
      for await (const chunk of req) body += chunk;
      try{
        const data = JSON.parse(body);
        const { nombre='', correo='', asunto='', prioridad='media', descripcion='' } = data;
        if(!nombre || !correo || !asunto || !descripcion) return sendJSON(res,400,{ok:false,error:'Campos requeridos'});
        const q = 'INSERT INTO solicitudes (user_id,nombre,correo,asunto,prioridad,descripcion) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,fecha';
        const vals = [auth.userId, nombre, correo, asunto, prioridad, descripcion];
        const r = await pool.query(q, vals);
        return sendJSON(res,201,{ok:true,id:r.rows[0].id, fecha:r.rows[0].fecha});
      }catch(err){
        return sendJSON(res,500,{ok:false,error:err.message});
      }
    }

    // DELETE /api/solicitudes/:id -> admin borra cualquiera, usuario solo los suyos
    if(req.method === 'DELETE'){
      if(!pool) return sendJSON(res,501,{ok:false,error:'DB not available'});
      const parts = url.pathname.split('/').filter(Boolean); // ['api','solicitudes',':id']
      const id = Number(parts[2]);
      if(!id) return sendJSON(res,400,{ok:false,error:'id inválido'});
      try{
        // comprobar existencia
        const r0 = await pool.query('SELECT id,user_id FROM solicitudes WHERE id=$1 LIMIT 1',[id]);
        if(r0.rowCount===0) return sendJSON(res,404,{ok:false,error:'Solicitud no encontrada'});
        const rec = r0.rows[0];
        if(auth.role !== 'admin' && rec.user_id !== auth.userId) return sendJSON(res,403,{ok:false,error:'No tienes permiso para borrar esta solicitud'});
        await pool.query('DELETE FROM solicitudes WHERE id=$1',[id]);
        return sendJSON(res,200,{ok:true,message:'Eliminada'});
      }catch(err){
        return sendJSON(res,500,{ok:false,error:err.message});
      }
    }
  }

  return sendJSON(res,404,{ok:false,error:'API route not found'});
}

function serveStatic(req, res){
  let pathname = new URL(req.url, `http://localhost:${port}`).pathname;
  if(pathname === '/') pathname = '/index.html';
  const filePath = path.join(process.cwd(), pathname.replace(/\/+/, '/'));

  // Security: prevent file escaping
  if(!filePath.startsWith(process.cwd())){
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    if(err || !st.isFile()){
      res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.writeHead(200,{'Content-Type': type});
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  try{
    if(req.url.startsWith('/api/')) return handleApi(req,res);
    return serveStatic(req,res);
  }catch(e){
    res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Server error');
  }
});

server.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  if(pool){
    try{
      const client = await pool.connect();
      client.release();
      console.log('DB pool connected (Postgres) ->', process.env.DB_NAME || 'mesalab');
    }catch(err){
      console.warn('DB connection test failed:', err.message);
    }
  }else{
    console.log('No DB pool configured; API endpoints using DB will return 501.');
  }
});

module.exports = { server, pool };
