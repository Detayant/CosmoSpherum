function getCurrentUser() {
  const u = localStorage.getItem('cosmospherum_user');
  return u ? JSON.parse(u) : null;
}
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('cosmospherum_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cosmospherum_user');
  }
  updateAuthUI();
}
function isLoggedIn() { return !!getCurrentUser(); }
function getSessionToken() {
  const u = getCurrentUser();
  return u ? u.sessionToken : null;
}

function escapeHtml(text) {
  if (!text) return text;
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authBlock = document.getElementById('auth-block');
  if (!authBlock) return;

  if (user) {
    const birthDate = user.birthDate ? user.birthDate.substring(0, 10) : '';
    const regDate = user.registrationDate ? user.registrationDate.substring(0, 10) : '';
    authBlock.innerHTML = `
      <div class="user-profile-trigger" id="user-profile-trigger">
        <span id="user-name-display">${escapeHtml(user.fullName.split(' ')[1] || user.fullName)}</span>
        <div class="profile-popup" id="profile-popup">
          <p><strong>ФИО:</strong> ${escapeHtml(user.fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Дата рождения:</strong> ${escapeHtml(birthDate)}</p>
          <p><strong>Дата регистрации:</strong> ${escapeHtml(regDate)}</p>
          <button class="btn btn-small edit-profile-btn-popup">Редактировать</button>
        </div>
      </div>
      <a href="#" id="logout-btn" class="nav-link">Выйти</a>
    `;

    const trigger = document.getElementById('user-profile-trigger');
    const popup = document.getElementById('profile-popup');
    const editBtn = popup.querySelector('.edit-profile-btn-popup');

    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target)) {
        popup.classList.remove('pinned');
      }
    });

    document.getElementById('user-name-display').addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle('pinned');
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.remove('pinned');
      window.showEditInfoModal(user);
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    authBlock.innerHTML = `<a href="login.html" class="nav-link">Войти</a>`;
  }
}

function logout() {
  const token = getSessionToken();
  if (token) {
    apiLogout(token, () => {});
  }
  setCurrentUser(null);
  window.location.href = 'login.html';
}

function checkAuth(callback) {
  const token = getSessionToken();
  if (!token) {
    logout();
    return;
  }
  apiGetProfile(token, (res) => {
    if (res.success) {
      const user = getCurrentUser();
      if (user) {
        user.fullName = res.data.user.fullName;
        user.email = res.data.user.email;
        user.birthDate = res.data.user.birthDate;
        user.registrationDate = res.data.user.registrationDate;
        setCurrentUser(user);
      }
      if (callback) callback(true);
    } else {
      if (callback) callback(false);
      logout();
    }
  });
}

window.showEditInfoModal = function(user) {
  const html = `
    <div class="modal" style="display:flex;">
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h3>Редактирование данных</h3>
        <div class="tabs" style="margin-top:20px;">
          <button class="tab-btn active" data-subtab="name">ФИО</button>
          <button class="tab-btn" data-subtab="password">Пароль</button>
        </div>
        <div id="subtab-content" style="margin-top:20px;">
          <div id="subtab-name">
            <div class="form-group"><label>Новое ФИО</label><input type="text" id="edit-fullname" value="${escapeHtml(user.fullName)}"></div>
            <div class="form-group"><label>Текущий пароль (для подтверждения)</label><input type="password" id="current-password-name"></div>
            <button class="btn" id="save-name-btn">Сохранить</button>
            <p class="error-msg" id="name-error"></p>
          </div>
          <div id="subtab-password" style="display:none;">
            <p class="info-text">Код подтверждения будет отправлен на <strong>${escapeHtml(user.email)}</strong></p>
            <button class="btn" id="send-code-btn" style="margin-top:10px;">Отправить код</button>
            <div id="code-section" style="display:none; margin-top:15px;">
              <div class="form-group"><label>Код из письма</label><input type="text" id="reset-code"></div>
              <div class="form-group"><label>Новый пароль</label><input type="password" id="new-password"></div>
              <div class="form-group"><label>Подтверждение</label><input type="password" id="new-password-confirm"></div>
              <button class="btn" id="change-password-submit">Сменить пароль</button>
              <p class="error-msg" id="change-error"></p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const modalEl = wrapper.firstElementChild;
  document.body.appendChild(modalEl);

  modalEl.querySelector('.close-btn').addEventListener('click', () => modalEl.remove());
  modalEl.addEventListener('click', e => { if (e.target === modalEl) modalEl.remove(); });

  modalEl.querySelectorAll('.tab-btn[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      modalEl.querySelectorAll('.tab-btn[data-subtab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modalEl.querySelector('#subtab-name').style.display = btn.dataset.subtab === 'name' ? 'block' : 'none';
      modalEl.querySelector('#subtab-password').style.display = btn.dataset.subtab === 'password' ? 'block' : 'none';
    });
  });

  modalEl.querySelector('#save-name-btn').addEventListener('click', () => {
    const fullName = modalEl.querySelector('#edit-fullname').value.trim();
    const password = modalEl.querySelector('#current-password-name').value;
    if (!fullName || !password) { modalEl.querySelector('#name-error').textContent = 'Заполните все поля'; return; }
    const token = getSessionToken();
    apiUpdateProfile(token, fullName, password, res => {
      if (res.success) { alert('ФИО обновлено'); user.fullName = fullName; setCurrentUser(user); modalEl.remove(); }
      else modalEl.querySelector('#name-error').textContent = res.message || 'Ошибка';
    });
  });

  modalEl.querySelector('#send-code-btn').addEventListener('click', function() {
    apiRequestPasswordChange(user.email, res => {
      if (res.success) {
        modalEl.querySelector('#code-section').style.display = 'block';
        const sendBtn = modalEl.querySelector('#send-code-btn');
        sendBtn.style.display = 'none';
        sendBtn.previousElementSibling.style.display = 'none';
      } else alert(res.message || 'Ошибка');
    });
  });

  modalEl.querySelector('#change-password-submit').addEventListener('click', () => {
    const code = modalEl.querySelector('#reset-code').value.trim();
    const pass = modalEl.querySelector('#new-password').value;
    const conf = modalEl.querySelector('#new-password-confirm').value;
    if (!code || !pass || pass !== conf) { modalEl.querySelector('#change-error').textContent = 'Неверный код или пароли не совпадают'; return; }
    apiChangePassword(user.email, code, pass, res => {
      if (res.success) { alert('Пароль изменён'); modalEl.remove(); }
      else modalEl.querySelector('#change-error').textContent = res.message || 'Ошибка';
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  if (isLoggedIn()) {
    checkAuth();
  }
});
