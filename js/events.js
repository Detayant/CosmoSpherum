let selectedEventId = null;
let eventsStatus = {};
let myPlannedEventIds = [];

document.addEventListener('DOMContentLoaded', () => {
  apiGetEventsStatus(res => {
    if (res.success && res.data) eventsStatus = res.data;
    if (isLoggedIn()) {
      checkAuth((valid) => {
        if (valid) loadUserBookings();
        else renderEvents();
      });
    } else {
      renderEvents();
    }
  });
  setupBookingModal();
});

function loadUserBookings() {
  if (!isLoggedIn()) {
    myPlannedEventIds = [];
    renderEvents();
    return;
  }
  apiGetProfile(getSessionToken(), res => {
    if (res.success && res.data && res.data.bookings) {
      myPlannedEventIds = res.data.bookings
        .filter(b => b.status === 'planned')
        .map(b => b.eventId);
    } else {
      myPlannedEventIds = [];
    }
    renderEvents();
  });
}

function renderEvents() {
  const container = document.getElementById('events-list');
  if (!container) return;
  const user = getCurrentUser(), favs = user ? JSON.parse(localStorage.getItem('favs') || '[]') : [];
  const now = new Date();

  container.innerHTML = EVENTS.map(ev => {
    const stats = eventsStatus[ev.id] || { booked: 0 };
    const booked = Number(stats.booked) || 0;
    const available = Math.max(ev.capacity - booked, 0);
    const ageHtml = `<div class="age-rating">Возрастное ограничение: ${ev.age || '12+'}</div>`;
    const soldOut = available === 0;
    const coming = ev.comingSoon === true;
    const alreadyBooked = myPlannedEventIds.includes(ev.id);

    let sessionHtml = '';
    const sortedSessions = ev.sessions.slice().sort();
    const futureSessions = sortedSessions.filter(s => new Date(s) >= now);
    if (coming || !ev.sessions.length) {
      sessionHtml = '<strong>Ближайший сеанс:</strong> <span>Будут объявлены</span>';
    } else if (futureSessions.length) {
      const d = new Date(futureSessions[0]);
      sessionHtml = `<strong>Ближайший сеанс:</strong> <span>${d.toLocaleString('ru-RU', {day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</span>`;
    } else {
      sessionHtml = '<strong>Ближайший сеанс:</strong> <span>Сеансы завершены</span>';
    }

    const futureExists = !coming && ev.sessions.some(s => new Date(s) >= now);
    const canBook = !soldOut && futureExists;

    const bookBtn = coming ? '' : (
      isLoggedIn()
        ? `<button class="btn book-btn" data-event-id="${escapeHtml(ev.id)}" ${canBook && !alreadyBooked ? '' : 'disabled'}>${soldOut ? 'Нет мест' : (!futureExists ? 'Завершены' : (alreadyBooked ? 'Вы уже записаны' : 'Записаться'))}</button>`
        : `<button class="btn book-btn" data-event-id="${escapeHtml(ev.id)}" disabled>Войдите, чтобы записаться</button>`
    );
    const favBtn = coming ? '' : `
      <button class="btn fav-btn" data-event-id="${escapeHtml(ev.id)}" ${!isLoggedIn() ? 'disabled' : ''}>
        ${favs.includes(ev.id) ? 'Вам понравилось ❤️' : 'В избранное'}
      </button>`;

    return `<div class="card event-card ${coming ? 'coming-soon' : ''}">
      <div class="event-card-inner">
        <h3>${escapeHtml(ev.title)}</h3>${ageHtml}
        <div class="event-section description"><p>${escapeHtml(ev.description)}</p></div>
        <div class="event-section format"><strong>Формат:</strong> ${escapeHtml(ev.format)}</div>
        <div class="event-section sessions">${sessionHtml}</div>
        <div class="event-section duration"><strong>Длительность:</strong> ${escapeHtml(ev.duration)}</div>
        <div class="event-section price"><strong>Стоимость:</strong> ${ev.price} ₽</div>
        <div class="event-footer">
          <p class="event-section seats">Доступно мест: ${coming ? '—' : `${available} из ${ev.capacity}`}</p>
          <div class="event-actions">${bookBtn}${favBtn}</div>
        </div>
      </div>
      ${coming ? '<div class="coming-soon-badge">Скоро...</div>' : ''}
    </div>`;
  }).join('');

  document.querySelectorAll('.book-btn:not([disabled])').forEach(btn => btn.addEventListener('click', e => {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
    checkAuth((valid) => {
      if (valid) openBookingModal(e.target.dataset.eventId);
    });
  }));

  document.querySelectorAll('.fav-btn:not([disabled])').forEach(btn => btn.addEventListener('click', e => {
    if (!isLoggedIn()) return;
    checkAuth((valid) => {
      if (!valid) return;
      const id = e.target.dataset.eventId;
      const favList = JSON.parse(localStorage.getItem('favs') || '[]');
      const token = getSessionToken();
      if (favList.includes(id)) {
        apiRemoveFavorite(token, id, res => {
          if (res.success) {
            localStorage.setItem('favs', JSON.stringify(favList.filter(x => x !== id)));
            renderEvents();
          } else {
            alert(res.message || 'Не удалось удалить из избранного');
          }
        });
      } else {
        apiAddFavorite(token, id, res => {
          if (res.success) {
            favList.push(id);
            localStorage.setItem('favs', JSON.stringify(favList));
            renderEvents();
          } else {
            alert(res.message || 'Не удалось добавить в избранное');
          }
        });
      }
    });
  }));
}

function openBookingModal(eventId) {
  selectedEventId = eventId;
  const ev = EVENTS.find(e => e.id === eventId);
  document.getElementById('booking-title').textContent = `Бронирование: ${ev.title}`;
  const now = new Date();
  const nearest = ev.sessions.filter(s => new Date(s) >= now).sort()[0];
  const display = document.getElementById('session-display');
  if (nearest) {
    const d = new Date(nearest);
    display.textContent = d.toLocaleString('ru-RU', {day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    display.dataset.sessionValue = nearest;
  } else {
    display.textContent = 'Нет доступных сеансов';
    display.dataset.sessionValue = '';
  }
  document.getElementById('tickets-count').value = 1;
  document.getElementById('booking-price').textContent = `Итого: ${ev.price} ₽`;
  document.getElementById('booking-modal').style.display = 'flex';
}

function setupBookingModal() {
  document.getElementById('close-booking').addEventListener('click', () => {
    document.getElementById('booking-modal').style.display = 'none';
  });

  document.getElementById('tickets-count').addEventListener('change', recalcPrice);

  document.getElementById('booking-form').addEventListener('submit', e => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) { alert('Необходима авторизация'); return; }
    checkAuth((valid) => {
      if (!valid) return;
      const ev = EVENTS.find(e => e.id === selectedEventId);
      const session = document.getElementById('session-display').dataset.sessionValue;
      if (!session) {
        document.getElementById('booking-msg').textContent = 'Нет доступного сеанса';
        return;
      }
      const tickets = parseInt(document.getElementById('tickets-count').value);
      apiBookEvent(token, selectedEventId, session, tickets, ev.title, res => {
        if (res.success) {
          alert(`Бронь №${res.bookingId} создана!`);
          myPlannedEventIds.push(selectedEventId);
          document.getElementById('booking-modal').style.display = 'none';
          apiGetEventsStatus(statusRes => {
            if (statusRes.success && statusRes.data) eventsStatus = statusRes.data;
            renderEvents();
          });
        } else {
          document.getElementById('booking-msg').textContent = res.message || 'Ошибка';
        }
      });
    });
  });
}

function recalcPrice() {
  const ev = EVENTS.find(e => e.id === selectedEventId);
  if (!ev) return;
  const tickets = parseInt(document.getElementById('tickets-count').value) || 1;
  document.getElementById('booking-price').textContent = `Итого: ${ev.price * tickets} ₽`;
}
