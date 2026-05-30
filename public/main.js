// main.js - validaciones y manejo de formularios para Mesalab
(function(){
  // utilidades
  function $(sel, root=document){ return root.querySelector(sel); }
  function showMessage(container, text, type='success'){
    if(!container) return;
    container.classList.remove('hidden','success','error');
    container.classList.add(type);
    container.textContent = text;
    container.classList.remove('hidden');
  }
  function hideMessage(container){ if(!container) return; container.classList.add('hidden'); container.textContent=''; }
  function markFieldError(el, on=true){ if(!el) return; if(on) el.classList.add('field-error'); else el.classList.remove('field-error'); }
  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  const registeredUsers = [
    { email: 'admin@ejemplo.com', password: 'adminpass', name: 'Administrador' },
    { email: 'usuario@ejemplo.com', password: 'userpass', name: 'Usuario de prueba' },
    { email: 'lucia.garcia@example.com', password: 'luciapass', name: 'Lucía García' },
    { email: 'carlos.mendez@example.com', password: 'carlospass', name: 'Carlos Méndez' },
    { email: 'marta.rios@example.com', password: 'martapass', name: 'Marta Ríos' }
  ];

  // LOGIN
  const loginForm = $('#loginForm');
  if(loginForm){
    const email = $('#email', loginForm);
    const password = $('#password', loginForm);
    const msg = $('#loginMessage');

    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      hideMessage(msg);
      let ok = true;

      [email,password].forEach(f=>markFieldError(f,false));

      if(!email.value.trim()){ markFieldError(email,true); ok=false; }
      else if(!isEmail(email.value.trim())){ markFieldError(email,true); showMessage(msg,'Formato de correo inválido.','error'); ok=false; }

      if(!password.value.trim()){ markFieldError(password,true); ok=false; }
      if(!ok){ if(!msg.textContent) showMessage(msg,'Corrige los campos marcados y vuelve a intentar.','error'); return; }

      if(registeredUsers.length === 0){
        showMessage(msg,'No existe un usuario registrado. Contacta con el administrador.','error');
        return;
      }

      const user = registeredUsers.find(u => u.email.toLowerCase() === email.value.trim().toLowerCase());
      if(!user){
        showMessage(msg,'No existe un usuario registrado con ese correo.','error');
        markFieldError(email,true);
        return;
      }

      if(user.password !== password.value){
        showMessage(msg,'Correo o contraseña incorrectos.','error');
        markFieldError(password,true);
        return;
      }

      showMessage(msg,'Ingreso correcto. Redirigiendo...','success');
      setTimeout(()=>{ window.location.href = 'panel.html'; }, 700);
    });
  }

  // PANEL (solicitudes)
  const solForm = $('#solicitudForm');
  if(solForm){
    const inputNombre = $('#nombre');
    const inputCorreo = $('#correo');
    const inputAsunto = $('#asunto');
    const inputPrioridad = $('#prioridad');
    const inputDescripcion = $('#descripcion');
    const tableBody = document.querySelector('#solTable tbody');
    const msg = $('#panelMessage');
    const STORAGE_KEY = 'mesalab_solicitudes_v1';

    function load(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    function priorityClass(p){ return p==='alta'? 'priority-high' : (p==='media'? 'priority-med':'priority-low'); }
    function escapeHtml(s){ return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

    function render(){
      const list = load();
      tableBody.innerHTML = '';
      list.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.id}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td>${escapeHtml(item.correo)}</td>
          <td>${escapeHtml(item.asunto)}</td>
          <td><span class="pill ${priorityClass(item.prioridad)}">${item.prioridad}</span></td>
          <td>${item.fecha}</td>
          <td><button data-id="${item.id}" class="btn ghost btn-del">Eliminar</button></td>
        `;
        tableBody.appendChild(tr);
      });
    }

    solForm.addEventListener('submit', e => {
      e.preventDefault();
      hideMessage(msg);
      [inputNombre,inputCorreo,inputAsunto,inputDescripcion].forEach(f=>markFieldError(f,false));

      let ok = true;
      const nombre = inputNombre.value.trim();
      const correo = inputCorreo.value.trim();
      const asunto = inputAsunto.value.trim();
      const descripcion = inputDescripcion.value.trim();
      const prioridad = inputPrioridad.value;

      if(!nombre){ markFieldError(inputNombre,true); ok=false; }
      if(!correo || !isEmail(correo)){ markFieldError(inputCorreo,true); ok=false; }
      if(!asunto){ markFieldError(inputAsunto,true); ok=false; }
      if(!descripcion || descripcion.length < 10){ markFieldError(inputDescripcion,true); ok=false; }

      if(!ok){ showMessage(msg,'Hay errores en el formulario. Revisa los campos marcados.','error'); return; }

      const item = {
        id: Date.now(),
        nombre, correo, asunto, prioridad, descripcion,
        fecha: new Date().toLocaleString()
      };
      const list = load();
      list.unshift(item);
      save(list);
      solForm.reset();
      render();
      showMessage(msg,'Solicitud registrada correctamente.','success');
    });

    tableBody.addEventListener('click', e => {
      if(e.target.matches('.btn-del')){
        const id = Number(e.target.dataset.id);
        let list = load();
        list = list.filter(i => i.id !== id);
        save(list);
        render();
        showMessage(msg,'Solicitud eliminada.','success');
      }
    });

    render();
  }
})();