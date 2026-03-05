const praiseMessages = [
    "Офигеть какая ты красивая!",
    "Ничего себе какой ты шикарный!",
    "Как же шикарно ты поёшь!",
    "Ты великолепно рисуешь!",
    "Потрясающе выглядишь!",
    "Ты просто звезда!",
    "Вау, какой талант!",
    "Ты невероятный!",
    "Это шедевр!",
    "Ты вдохновляешь!"
];

class YaSamayaPi {
    constructor() {
        this.isBanned = localStorage.getItem('bannedUntil') && parseInt(localStorage.getItem('bannedUntil')) > Date.now();
        this.videos = JSON.parse(localStorage.getItem('userVideos')) || [];
        this.responses = JSON.parse(localStorage.getItem('responses')) || [];
        this.currentCamera = 'user'; // фронтальная камера по умолчанию
        this.stream = null; // храним поток камеры
        this.init();
    }

    init() {
        if (this.isBanned) {
            document.getElementById('ban-message').style.display = 'block';
            return;
        }

        this.setupEventListeners();
        this.loadVideos();
        this.renderResponses();
    }

    setupEventListeners() {
        document.getElementById('go-btn').addEventListener('click', () => this.startCamera());
        document.getElementById('switch-camera').addEventListener('click', () => this.switchCamera());
        document.getElementById('record-btn').addEventListener('click', () => this.recordVideo());
    }

    startCamera() {
        const constraints = {
            video: { facingMode: this.currentCamera },
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

        // Останавливаем текущий поток
        this.stream.getTracks().forEach(track => track.stop());

        // Переключаем режим камеры
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';

        // Запускаем камеру с новым режимом
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

            // Останавливаем все треки потока
            this.stream.getTracks().forEach(track => track.stop());
            document.getElementById('camera-preview').srcObject = null;
            this.stream = null;
        };

        mediaRecorder.start();

        // Автоматическая остановка через 10 секунд
        setTimeout(() => mediaRecorder.stop(), 10000);
    }

    saveVideo(blob) {
        if (this.videos.length >= 2) {
            alert('Достигнут лимит в 2 видео!');
            return;
        }

        const videoURL = URL.createObjectURL(blob);
        this.videos.push(videoURL);
        localStorage.setItem('userVideos', JSON.stringify(this.videos));
        this.loadVideos();
    }

    loadVideos() {
        const v1 = document.getElementById('video1');
        const v2 = document.getElementById('video2');

        v1.src = this.videos[0] || '';
        v2.src = this.videos[1] || '';

        v1.style.display = this.videos[0] ? 'block' : 'none';
        v2.style.display = this.videos[1] ? 'block' : 'none';
    }

    addResponse() {
        if (this.isBanned) return;

        const types = ['video', 'audio', 'text'];
        const type = types[Math.floor(Math.random() * types.length)];
        let content;

        switch (type) {
            case 'video':
                content = `<video src="https://example.com/praise-video.mp4" controls style="width:100%"></video>`;
                break;
            case 'audio':
                content = `<audio controls><source src="https://example.com/praise-audio.mp3" type="audio/mpeg"></audio>`;
                break;
            case 'text':
                const msg = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
                content = `<p>${msg}</p>`;
                break;
        }

        const response = {
            id: Date.now(),
            type,
            content,
            hasCriticism: false
        };

        this.responses.push(response);
        localStorage.setItem('responses', JSON.stringify(this.responses));
        this.renderResponses();
    }

    renderResponses() {
        const container = document.getElementById('responses');
        container.innerHTML = '';

        this.responses.forEach(resp => {
            const div = document.createElement('div');
            div.className = 'response-item';
            div.innerHTML = `
        ${resp.content}
        <button class="btn" onclick="app.reportCriticism(${resp.id})">Критика</button>
      `;
            container.appendChild(div);
        });
    }

    reportCriticism(responseId) {
        if (this.isBanned) return;

        // Устанавливаем бан на 24 часа
        const now = Date.now();
        const banUntil = now + 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
        localStorage.setItem('bannedUntil', banUntil.toString());
        this.isBanned = true;

        // Показываем сообщение о бане
        document.getElementById('ban-message').style.display = 'block';

        // Скрываем основной интерфейс
        document.querySelector('.video-section').style.display = 'none';
        document.querySelector('.responses-section').style.display = 'none';

        // Очищаем ответы — удаляем все ответы пользователя
        this.responses = [];
        localStorage.setItem('responses', JSON.stringify(this.responses));
        this.renderResponses();
    }

    // Метод для генерации случайных ответов‑похвал
    generateRandomResponse() {
        if (this.isBanned) return;

        const types = ['video', 'audio', 'text'];
        const type = types[Math.floor(Math.random() * types.length)];
        let content;

        switch (type) {
            case 'video':
                // В реальной реализации здесь будет ссылка на реальное видео
                content = `<video src="https://example.com/praise-video.mp4" controls style="width:100%">
          Ваш браузер не поддерживает видео.
        </video>`;
                break;
            case 'audio':
                // В реальной реализации — ссылка на реальный аудиофайл
                content = `<audio controls>
          <source src="https://example.com/praise-audio.mp3" type="audio/mpeg">
          Ваш браузер не поддерживает аудио.
        </audio>`;
                break;
            case 'text':
                const msg = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
                content = `<p>${msg}</p>`;
                break;
        }

        const response = {
            id: Date.now(),
            type,
            content,
            hasCriticism: false
        };

        this.responses.push(response);
        localStorage.setItem('responses', JSON.stringify(this.responses));
        this.renderResponses();
    }
}

// Инициализация приложения после загрузки страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new YaSamayaPi();

    // Автоматически добавляем несколько тестовых ответов для демонстрации
    for (let i = 0; i < 3; i++) {
        app.generateRandomResponse();
    }
});
