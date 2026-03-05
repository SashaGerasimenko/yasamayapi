class YaSamayaPi {
    constructor() {
        this.currentUser = localStorage.getItem('currentUser');
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
        document.getElementById('main-tab').style.display = 'none';
        document.getElementById('rating-tab').style.display = 'none';
    }

    login(username) {
        if (!username) return;
        this.currentUser = username;
        localStorage.setItem('currentUser', username);
        // Создаём пользователя, если его нет
        const users = JSON.parse(localStorage.getItem('users'));
        if (!users[username]) {
            users[username] = { videos: [], reactions: [] };
            localStorage.setItem('users', JSON.stringify(users));
        }
        this.showMainInterface();
    }

    showMainInterface() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('main-tab').style.display = 'block';
        this.loadVideos();
        this.renderResponses();
    }

    setupEventListeners() {
        // Логин
        document.getElementById('login-btn').addEventListener('click', () => {
            const username = document.getElementById('username-input').value;
            this.login(username);
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
        }
    }

    loadUserData() {
        if (!this.currentUser) return;
        const users = JSON.parse(localStorage.getItem('users'));
        this.userVideos = users[this.currentUser]?.videos || [];
        this.userReactions = users[this.currentUser]?.reactions || [];
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
        users[this.currentUser].videos = this.userVideos;
        localStorage.setItem('users', JSON.stringify(users));
    }

    sendReaction() {
        if (this.isBanned) return;

        const type = document.getElementById('reaction-type').value;
        const content = document.getElementById('reaction-content').value;

        if (!content) {
            alert('Введите текст реакции!');
            return;
        }

        // Получаем все видео текущего пользователя
        const allUsers = JSON.parse(localStorage.getItem('users'));
        const userVideos = allUsers[this.currentUser]?.videos || [];

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
            fromUser: this.currentUser,
            timestamp: new Date().toISOString()
        };

        targetVideo.reactions.push(reaction);
        this.updateUserVideos();

        // Обновляем счётчик реакций пользователя
        this.incrementReactionCount(this.currentUser);

        document.getElementById('reaction-content').value = '';
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

        // Показываем реакции на видео текущего пользователя
        const allUsers = JSON.parse(localStorage.getItem('users'));
        const userVideos = allUsers[this.currentUser]?.videos || [];

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
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new YaSamayaPi();
});
