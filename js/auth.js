document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const verifySection = document.getElementById('verify-section');
  let pendingEmail = '';

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.style.display = 'block'; registerForm.style.display = 'none'; verifySection.style.display = 'none';
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    registerForm.style.display = 'block'; loginForm.style.display = 'none'; verifySection.style.display = 'none';
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if (!email || !password) { err.textContent = 'Заполните все поля'; return; }
    apiLogin(email, password, (res) => {
      if (res.success) {
        const user = res.user;
        user.sessionToken = res.sessionToken;
        setCurrentUser(user);
        checkAuth((valid) => {
          if (valid) window.location.href = 'index.html';
        });
      } else err.textContent = res.message || 'Ошибка входа';
    });
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const birthDate = document.getElementById('reg-birthdate').value;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;
    const agreePolicy = document.getElementById('agree-policy').checked;
    const agreeData = document.getElementById('agree-data').checked;
    const err = document.getElementById('register-error');

    if (!/^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?\s[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+$/.test(fullName)) { err.textContent = 'Введите ФИО: Фамилия Имя Отчество'; return; }
    if (!email.includes('@') || !email.includes('.')) { err.textContent = 'Некорректный email'; return; }
    if (password.length < 6) { err.textContent = 'Минимум 6 символов'; return; }
    if (password !== confirm) { err.textContent = 'Пароли не совпадают'; return; }
    if (!agreePolicy || !agreeData) { err.textContent = 'Примите условия'; return; }

    apiRegister(fullName, birthDate, email, password, (res) => {
      if (res.success) { pendingEmail = email; registerForm.style.display = 'none'; verifySection.style.display = 'block'; }
      else err.textContent = res.message || 'Ошибка регистрации';
    });
  });

  document.getElementById('verify-btn').addEventListener('click', () => {
    const code = document.getElementById('verify-code').value.trim();
    const err = document.getElementById('verify-error');
    if (!code) { err.textContent = 'Введите код'; return; }
    apiVerifyEmail(pendingEmail, code, (res) => {
      if (res.success) { alert('Email подтверждён! Теперь войдите.'); tabLogin.click(); pendingEmail = ''; }
      else err.textContent = res.message || 'Неверный код';
    });
  });
});
