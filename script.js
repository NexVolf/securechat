const socket = io();

let currentUser = {
    username: '',
    roomCode: ''
};

let remoteUsername = '';
let typingTimeout = null;
let qrCodeInstance = null;
let html5QrcodeScanner = null;

const el = {
    usernameInput: document.getElementById('usernameInput'),
    continueBtn: document.getElementById('continueBtn'),
    backToUsername: document.getElementById('backToUsername'),
    roomCode: document.getElementById('roomCode'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    scanQrBtn: document.getElementById('scanQrBtn'),
    qrScanner: document.getElementById('qrScanner'),
    stopScanBtn: document.getElementById('stopScanBtn'),
    waitingStatus: document.getElementById('waitingStatus'),
    themeToggle: document.getElementById('themeToggle'),
    themeToggleChat: document.getElementById('themeToggleChat'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingName: document.getElementById('typingName'),
    statusText: document.getElementById('statusText'),
    status: document.getElementById('status'),
    roomCodeBadge: document.getElementById('roomCodeBadge'),
    chatDate: document.getElementById('chatDate'),
    contactName: document.getElementById('contactName'),
    contactInitial: document.getElementById('contactInitial')
};

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${screen}Screen`).classList.add('active');
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initTheme() {
    const savedTheme = localStorage.getItem('chatTheme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('chatTheme', newTheme);
}

function initEmojis() {
    const emojiGrid = document.querySelector('.emoji-grid');
    if (!emojiGrid) return;
    
    const emojis = emojiGrid.textContent.split(' ').filter(e => e.trim());
    emojiGrid.innerHTML = '';
    
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.addEventListener('click', () => {
            el.messageInput.value += emoji;
            el.messageInput.focus();
        });
        emojiGrid.appendChild(span);
    });
}

el.continueBtn.addEventListener('click', () => {
    const username = el.usernameInput.value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }
    currentUser.username = username;
    localStorage.setItem('chatUsername', username);
    showScreen('room');
});

el.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el.continueBtn.click();
});

el.backToUsername.addEventListener('click', () => {
    showScreen('username');
    resetRoom();
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

el.createRoomBtn.addEventListener('click', () => {
    const roomCode = generateRoomCode();
    currentUser.roomCode = roomCode;
    el.roomCode.textContent = roomCode;
    generateQRCode(roomCode);
    el.waitingStatus.style.display = 'flex';
    
    socket.emit('create-room', {
        roomCode: roomCode,
        username: currentUser.username
    });
});

el.copyCodeBtn.addEventListener('click', async () => {
    const code = el.roomCode.textContent;
    try {
        await navigator.clipboard.writeText(code);
        const btn = el.copyCodeBtn;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        setTimeout(() => btn.innerHTML = originalHTML, 2000);
    } catch (err) {
        alert(`Room Code: ${code}`);
    }
});

el.joinRoomBtn.addEventListener('click', () => {
    const roomCode = el.roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
        alert('Please enter a room code');
        return;
    }
    joinRoom(roomCode);
});

el.roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el.joinRoomBtn.click();
});

el.roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
});

el.scanQrBtn.addEventListener('click', () => startQRScanner());
el.stopScanBtn.addEventListener('click', () => stopQRScanner());

function generateQRCode(code) {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    
    if (qrCodeInstance) {
        qrCodeInstance.clear();
    }
    
    qrCodeInstance = new QRCode(container, {
        text: code,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

async function startQRScanner() {
    el.qrScanner.style.display = 'block';
    el.scanQrBtn.style.display = 'none';
    
    html5QrcodeScanner = new Html5Qrcode("qrReader");
    
    try {
        await html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                stopQRScanner();
                el.roomCodeInput.value = decodedText.toUpperCase();
                joinRoom(decodedText.toUpperCase());
            }
        );
    } catch (err) {
        console.error('QR Scanner error:', err);
        alert('Could not access camera');
        stopQRScanner();
    }
}

async function stopQRScanner() {
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
        html5QrcodeScanner = null;
    }
    el.qrScanner.style.display = 'none';
    el.scanQrBtn.style.display = 'block';
}

function joinRoom(roomCode) {
    currentUser.roomCode = roomCode;
    socket.emit('join-room', {
        roomCode: roomCode,
        username: currentUser.username
    });
}

function resetRoom() {
    currentUser.roomCode = '';
    el.roomCode.textContent = '------';
    el.roomCodeInput.value = '';
    el.waitingStatus.style.display = 'none';
    if (qrCodeInstance) {
        document.getElementById('qrcode').innerHTML = '';
    }
    stopQRScanner();
}

el.themeToggle.addEventListener('click', toggleTheme);
el.themeToggleChat.addEventListener('click', toggleTheme);

el.disconnectBtn.addEventListener('click', () => leaveRoom());

function leaveRoom() {
    socket.disconnect();
    setTimeout(() => socket.connect(), 100);
    
    currentUser.roomCode = '';
    remoteUsername = '';
    el.chatMessages.innerHTML = '<div class="date-divider"><span id="chatDate">Today</span></div>';
    el.waitingStatus.style.display = 'none';
    el.roomCode.textContent = '------';
    el.roomCodeInput.value = '';
    showScreen('room');
}

el.emojiBtn.addEventListener('click', () => {
    const isVisible = el.emojiPicker.style.display === 'block';
    el.emojiPicker.style.display = isVisible ? 'none' : 'block';
});

document.addEventListener('click', (e) => {
    if (!el.emojiPicker.contains(e.target) && !el.emojiBtn.contains(e.target)) {
        el.emojiPicker.style.display = 'none';
    }
});

el.sendBtn.addEventListener('click', sendMessage);
el.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const message = el.messageInput.value.trim();
    if (!message) return;
    
    socket.emit('send-message', {
        roomCode: currentUser.roomCode,
        message: message,
        username: currentUser.username
    });
    
    addMessage(message, currentUser.username, true, Date.now());
    el.messageInput.value = '';
    el.emojiPicker.style.display = 'none';
}

el.messageInput.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    
    const isTyping = el.messageInput.value.length > 0;
    socket.emit('typing', {
        roomCode: currentUser.roomCode,
        isTyping: isTyping,
        username: currentUser.username
    });
    
    typingTimeout = setTimeout(() => {
        socket.emit('typing', {
            roomCode: currentUser.roomCode,
            isTyping: false,
            username: currentUser.username
        });
    }, 1500);
});

function addMessage(text, username, isSent, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (!isSent) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = username;
        bubble.appendChild(sender);
    }
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    bubble.appendChild(textDiv);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(timestamp);
    bubble.appendChild(time);
    
    messageDiv.appendChild(bubble);
    el.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.innerHTML = `<span>${text}</span>`;
    el.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function scrollToBottom() {
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function updateChatUI() {
    el.roomCodeBadge.textContent = currentUser.roomCode;
    el.contactName.textContent = remoteUsername || 'Waiting...';
    el.contactInitial.textContent = remoteUsername ? remoteUsername.charAt(0).toUpperCase() : '?';
    setCurrentDate();
}

function setCurrentDate() {
    const today = new Date();
    el.chatDate.textContent = today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

socket.on('connect', () => {
    console.log('Connected to server');
    el.statusText.textContent = 'Connected';
    el.status.classList.add('online');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    el.statusText.textContent = 'Disconnected';
    el.status.classList.remove('online');
});

socket.on('room-created', (data) => {
    console.log('Room created:', data);
    currentUser.roomCode = data.roomCode;
});

socket.on('room-joined', (data) => {
    console.log('Room joined:', data);
    currentUser.roomCode = data.roomCode;
    showScreen('chat');
    
    const otherUser = data.users?.find(u => u.username !== currentUser.username);
    if (otherUser) {
        remoteUsername = otherUser.username;
    }
    
    updateChatUI();
    addSystemMessage(`You joined the room`);
});

socket.on('user-joined', (data) => {
    console.log('User joined:', data);
    remoteUsername = data.username;
    
    showScreen('chat');
    updateChatUI();
    addSystemMessage(`${data.username} joined the chat`);
});

socket.on('user-left', (data) => {
    console.log('User left:', data);
    addSystemMessage(`${data.username} left the chat`);
    remoteUsername = '';
    updateChatUI();
});

socket.on('receive-message', (data) => {
    console.log('Message received:', data);
    addMessage(data.message, data.username, false, data.timestamp);
});

socket.on('user-typing', (data) => {
    if (data.isTyping) {
        el.typingName.textContent = data.username;
        el.typingIndicator.style.display = 'flex';
    } else {
        el.typingIndicator.style.display = 'none';
    }
});

socket.on('error', (data) => {
    alert(data.message);
    showScreen('room');
});

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEmojis();
    
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
        el.usernameInput.value = savedUsername;
    }
});
