class YaSamayaPi {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.isBanned = localStorage.getItem('bannedUntil') && parseInt(localStorage.getItem('bannedUntil')) > Date.now();
    this.init();
  }

  init() {
    if (this.currentUser) {
      this.showMainInterface();
    } else {
      this.showLoginForm();
    }
    this.setupEventListeners();
    this.loadUserData();
  }

  showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('main-tab').style.display = 'none';
    document.getElementById('rating-tab').style.display = 'none';
    document.getElementById('deities-tab').style.display = 'none';
  }

  showRegisterForm() {
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('main-tab').style.display = 'none';
    document.getElementById('rating-tab').style.display = 'none';
    document.getElementById('deities-tab').style.display = 'none';
  }

  register(email, password) {
    if (!email || !password) {
      alert('Заполните все поля!');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) {
      alert('Пользователь с таким email уже существует!');
      return;
    }

    users[email] = {
      password: password,
              videos: [],
      reactions: []
    };

    localStorage.setItem('users', JSON.stringify(users));
    alert('Регистрация успешна! Теперь войдите в систему.');
    this.showLoginForm();
  }

  login(email, password) {
    if (!email || !password) {
      alert('Заполните все поля!');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || {};
    const user = users[email];

    if (!user || user.password !== password) {
      alert('Неверный email или пароль!');
      return;
    }

    this.currentUser = { email };
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    this.showMainInterface();
  }

  showMainInterface() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('main-tab').style.display = 'block';
    this.switchTab('main'); // делаем вкладку «Главная» активной при входе
    this.loadVideos();
    this.renderResponses();
  }

  setupEventListeners() {
    // Регистрация
    document.getElementById('register-btn').addEventListener('click', () => {
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      this.register(email, password);
    });

    // Логин
    document.getElementById('login-btn').addEventListener('click', () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      this.login(email, password);
    });

    // Вкладки
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Камера
    document.getElementById('go-btn').addEventListener('click', () => this.startCamera());
    document.getElementById('switch-camera').addEventListener('click', () => this.switchCamera());
    document.getElementById('record-btn').addEventListener('click', () => this.recordVideo());

    // Реакции
    document.getElementById('send-reaction').addEventListener('click', () => this.sendReaction());
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active-tab'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active-tab');
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`${tabName}-tab`).style.display = 'block';

    if (tabName === 'rating') {
      this.renderRating();
    } else if (tabName === 'deities') {
      this.renderUsersList();
    }
  }

  loadUserData() {
    if (!this.currentUser) return;
    const users = JSON.parse(localStorage.getItem('users'));
    this.userVideos = users[this.currentUser.email]?.videos || [];
    this.userReactions = users[this.currentUser.email]?.reactions || [];
  }

  loadVideos() {
    const v1 = document.getElementById('video1');
    const v2 = document.getElementById('video2');

    v1.src = this.userVideos[0]?.url || '';
    v2.src = this.userVideos[1]?.url || '';

    v1.style.display = this.userVideos[0] ? 'block' : 'none';
    v2.style.display = this.userVideos[1] ? 'block' : 'none';
  }

  startCamera() {
    if (this.isBanned) return;

    const constraints = {
      video: { facingMode: this.currentCamera || 'user' },
      audio: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        this.stream = stream;
        document.getElementById('camera-preview').srcObject = stream;
      })
      .catch(err => {
        console.error('Ошибка доступа к камере:', err);
        alert('Не удалось получить доступ к камере. Разрешите доступ к камере в настройках браузера.');
      });
  }

  switchCamera() {
    if (!this.stream) return;

    this.stream.getTracks().forEach(track => track.stop());
    this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
    this.startCamera();
  }

  recordVideo() {
    if (!this.stream) {
      alert('Сначала откройте камеру кнопкой "ГО"');
      return;
    }

    const mediaRecorder = new MediaRecorder(this.stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      this.saveVideo(videoBlob);
      this.stream.getTracks().forEach(track => track.stop());
      document.getElementById('camera-preview').srcObject = null;
      this.stream = null;
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 10000);
  }

  saveVideo(blob) {
    if (this.userVideos.length >= 2) {
      alert('Достигнут лимит в 2 видео!');
      return;
    }

    const videoURL = URL.createObjectURL(blob);
    const newVideo = {
      id: Date.now(),
      url: videoURL,
      reactions: []
    };

    this.userVideos.push(newVideo);
    this.updateUserVideos();
    this.loadVideos();
  }

  updateUserVideos() {
    const users = JSON.parse(localStorage.getItem('users'));
    users[this.currentUser.email].videos = this.userVideos;
    localStorage.setItem('users', JSON.stringify(users));
  }

  setupReactionHandlers() {
    document.getElementById('reaction-type').addEventListener('change', (e) => {
      this.showReactionInput(e.target.value);
    });
  }

  showReactionInput(type) {
    const contentDiv = document.getElementById('reaction-content-container');
    contentDiv.innerHTML = '';

    switch (type) {
      case 'video':
        contentDiv.innerHTML = `
          <button id="start-video-record" class="btn">Начать запись</button>
          <button id="stop-video-record" class="btn" style="display: none;">Остановить запись</button>
          <video id="recorded-video-preview" controls style="width: 100%; margin: 10px 0; display: none;"></video>
          <div id="video-recording-status" style="color: red; margin: 10px 0;"></div>
        `;
        this.setupVideoRecording();
        break;
      case 'audio':
        contentDiv.innerHTML = `
          <button id="start-audio-record" class="btn">Начать запись</button>
          <button id="stop-audio-record" class="btn" style="display: none;">Остановить запись</button>
          <audio id="recorded-audio-preview" controls style="margin: 10px 0; display: none;"></audio>
          <div id="audio-recording-status" style="color: red; margin: 10px 0;"></div>
        `;
        this.setupAudioRecording();
        break;
      case 'text':
      default:
        contentDiv.innerHTML = `
          <textarea id="reaction-text" placeholder="Напишите похвалу..." style="width: 100%; height: 60px;"></textarea>
        `;
    }
  }

  setupVideoRecording() {
    const startBtn = document.getElementById('start-video-record');
    const stopBtn = document.getElementById('stop-video-record');
    const preview = document.getElementById('recorded-video-preview');
    const status = document.getElementById('video-recording-status');

    let mediaRecorder;
    let recordedChunks = [];

    startBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        preview.srcObject = stream;
        preview.style.display = 'block';

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          preview.src = url;
          this.recordedVideoBlob = blob;
          status.textContent = 'Запись завершена. Можно отправить реакцию.';
        };

        mediaRecorder.start();
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        status.textContent = 'Идет запись...';
      } catch (err) {
        console.error('Ошибка доступа к камере:', err);
        alert('Не удалось получить доступ к камере. Разрешите доступ в настройках браузера.');
      }
    });

    stopBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      stopBtn.style.display = 'none';
    });
  }

  setupAudioRecording() {
    const startBtn = document.getElementById('start-audio-record');
    const stopBtn = document.getElementById('stop-audio-record');
    const preview = document.getElementById('recorded-audio-preview');
    const status = document.getElementById('audio-recording-status');

    let mediaRecorder;
    let recordedChunks = [];

    startBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          preview.src = url;
          preview.style.display = 'block';
          this.recordedAudioBlob = blob;
          status.textContent = 'Запись завершена. Можно отправить реакцию.';
        };

        mediaRecorder.start();
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        status.textContent = 'Идет запись...';
      } catch (err) {
        console.error('Ошибка доступа к микрофону:', err);
        alert('Не удалось получить доступ к микрофону. Разрешите доступ в настройках браузера.');
      }
    });

    stopBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      stopBtn.style.display = 'none';
    });
  }

  sendReaction() {
    if (this.isBanned) return;

    const type = document.getElementById('reaction-type').value;
    let content;

    switch (type) {
      case 'video':
        if (!this.recordedVideoBlob) {
          alert('Сначала запишите видео!');
          return;
        }
        content = URL.createObjectURL(this.recordedVideoBlob);
        break;
      case 'audio':
        if (!this.recordedAudioBlob) {
          alert('Сначала запишите аудио!');
          return;
        }
        content = URL.createObjectURL(this.recordedAudioBlob);
        break;
      case 'text':
        content = document.getElementById('reaction-text').value;
        if (!content) {
          alert('Введите текст реакции!');
          return;
        }
        break;
    }

    // Получаем все видео текущего пользователя
    const allUsers = JSON.parse(localStorage.getItem('users'));
    const userVideos = allUsers[this.currentUser.email]?.videos || [];

    if (userVideos.length === 0) {
      alert('Сначала загрузите видео!');
      return;
    }

    // Берём последнее видео для реакции
    const targetVideo = userVideos[userVideos.length - 1];

    const reaction = {
      id: Date.now(),
      type,
      content,
      fromUser: this.currentUser.email,
      timestamp: new Date().toISOString()
    };

    targetVideo.reactions.push(reaction);
    this.updateUserVideos();

    // Обновляем счётчик реакций пользователя
    this.incrementReactionCount(this.currentUser.email);

    // Очищаем записи
    this.recordedVideoBlob = null;
    this.recordedAudioBlob = null;

    this.renderResponses();
  }


  incrementReactionCount(username) {
    const reactionCounts = JSON.parse(localStorage.getItem('userReactionsCount')) || {};
    reactionCounts[username] = (reactionCounts[username] || 0) + 1;
    localStorage.setItem('userReactionsCount', JSON.stringify(reactionCounts));
  }

  renderResponses() {
    const container = document.getElementById('responses');
    container.innerHTML = '';

    const allUsers = JSON.parse(localStorage.getItem('users'));
    const userVideos = allUsers[this.currentUser.email]?.videos || [];

    userVideos.forEach(video => {
      video.reactions.forEach(reaction => {
        const div = document.createElement('div');
        div.className = 'response-item';

        let contentHtml;
        switch (reaction.type) {
          case 'video':
            contentHtml = `<video src="${reaction.content}" controls style="width:100%"></video>`;
            break;
          case 'audio':
            contentHtml = `<audio controls><source src="${reaction.content}" type="audio/mpeg"></audio>`;
            break;
                          default:
            contentHtml = `<p>${reaction.content}</p>`;
        }

        div.innerHTML = `
          <strong>От: ${reaction.fromUser}</strong><br>
          ${contentHtml}
          <small>${new Date(reaction.timestamp).toLocaleString()}</small>
          <button class="btn" onclick="app.reportCriticism('${reaction.id}')">Критика</button>
        `;
        container.appendChild(div);
      });
    });
  }

  reportCriticism(reactionId) {
    if (this.isBanned) return;

    const now = Date.now();
    const banUntil = now + 24 * 60 * 60 * 1000;
    localStorage.setItem('bannedUntil', banUntil.toString());
    this.isBanned = true;

    document.getElementById('ban-message').style.display = 'block';
    document.querySelector('.video-section').style.display = 'none';
    document.querySelector('.responses-section').style.display = 'none';
  }

  renderRating() {
    const container = document.getElementById('rating-list');
    const reactionCounts = JSON.parse(localStorage.getItem('userReactionsCount')) || {};

    // Сортируем пользователей по количеству реакций (по убыванию)
    const sortedUsers = Object.entries(reactionCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([user, count]) => ({ user, count }));

    container.innerHTML = '<ol>';
    sortedUsers.forEach(({ user, count }, index) => {
      container.innerHTML += `<li>${user} — ${count} реакций</li>`;
    });
    container.innerHTML += '</ol>';
  }

  renderUsersList() {
    const container = document.getElementById('users-list');
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const currentEmail = this.currentUser?.email;

    container.innerHTML = '';

    Object.keys(users).forEach(email => {
      // Пропускаем текущего пользователя
      if (email === currentEmail) return;

      const userData = users[email];
      if (!userData.videos || userData.videos.length === 0) return;

      const userCard = document.createElement('div');
      userCard.className = 'user-card';

      let videosHtml = '';
      userData.videos.forEach(video => {
        videosHtml += `
          <div>
            <video src="${video.url}" controls style="width: 100%; margin: 5px 0;"></video>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${video.reactions.map(reaction => `
                <div style="background: #f0f0f0; padding: 5px; border-radius: 3px;">
                  <strong>${reaction.fromUser}:</strong> ${reaction.content}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      userCard.innerHTML = `
        <h3>${email}</h3>
        ${videosHtml}
        <div>
          <textarea placeholder="Оставить реакцию..." style="width: 100%; height: 40px; margin: 5px 0;"
                  data-user="${email}"></textarea>
          <button class="btn" onclick="app.sendUserReaction('${email}')">Отправить</button>
        </div>
      `;

      container.appendChild(userCard);
    });

    if (container.innerHTML === '') {
      container.innerHTML = '<p>Пока нет пользователей с видео.</p>';
    }
  }

  sendUserReaction(targetUserEmail) {
    if (this.isBanned) return;

    const textarea = document.querySelector(`textarea[data-user="${targetUserEmail}"]`);
    const content = textarea.value;

    if (!content) {
      alert('Введите текст реакции!');
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users'));
    const targetUser = allUsers[targetUserEmail];

    if (!targetUser.videos || targetUser.videos.length === 0) {
      alert('У этого пользователя нет видео!');
      return;
    }

    // Берём первое видео для реакции
    const targetVideo = targetUser.videos[0];

    const reaction = {
      id: Date.now(),
      type: 'text',
      content,
      fromUser: this.currentUser.email,
      timestamp: new Date().toISOString()
    };

    targetVideo.reactions.push(reaction);
    localStorage.setItem('users', JSON.stringify(allUsers));

    this.incrementReactionCount(this.currentUser.email);

    textarea.value = '';
    this.renderUsersList();
  }
}

// Глобальные функции для HTML
window.showLoginForm = function() {
  app.showLoginForm();
};

window.showRegisterForm = function() {
  app.showRegisterForm();
};

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new YaSamayaPi();

  // Делаем вкладку «Самые пиз***ые» активной по умолчанию
  if (!app.currentUser) {
    app.switchTab('rating');
  }
});

