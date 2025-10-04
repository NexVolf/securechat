const socket = io();

// User Profile & State
let currentUser = {
    username: '',
    roomCode: '',
    avatar: null,
    bio: '',
    status: ''
};

let remoteUser = {
    username: '',
    avatar: null,
    bio: '',
    status: '',
    online: false,
    lastSeen: null
};

// Encryption
let encryptionKey = null;
const ENCRYPTION_ALGORITHM = 'AES-GCM';

// Media
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let voiceRecordingInterval = null;

// Misc
let typingTimeout = null;
let qrCodeInstance = null;
let html5QrcodeScanner = null;
let selfDestructInterval = null;

// DOM Elements
const el = {
    // Profile Screen
    profileUsername: document.getElementById('profileUsername'),
    profileBio: document.getElementById('profileBio'),
    profileStatus: document.getElementById('profileStatus'),
    avatarPreview: document.getElementById('avatarPreview'),
    avatarInitial: document.getElementById('avatarInitial'),
    avatarImage: document.getElementById('avatarImage'),
    cameraBtn: document.getElementById('cameraBtn'),
    uploadBtn: document.getElementById('uploadBtn'),
    avatarInput: document.getElementById('avatarInput'),
    profileContinueBtn: document.getElementById('profileContinueBtn'),
    bioCounter: document.getElementById('bioCounter'),
    statusCounter: document.getElementById('statusCounter'),
    
    // Room Screen
    backToProfile: document.getElementById('backToProfile'),
    roomCode: document.getElementById('roomCode'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    scanQrBtn: document.getElementById('scanQrBtn'),
    qrScanner: document.getElementById('qrScanner'),
    stopScanBtn: document.getElementById('stopScanBtn'),
    waitingStatus: document.getElementById('waitingStatus'),
    
    // Chat Screen
    disconnectBtn: document.getElementById('disconnectBtn'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    fileBtn: document.getElementById('fileBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    fileInput: document.getElementById('fileInput'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingName: document.getElementById('typingName'),
    statusText: document.getElementById('statusText'),
    status: document.getElementById('status'),
    roomCodeBadge: document.getElementById('roomCodeBadge'),
    chatDate: document.getElementById('chatDate'),
    contactName: document.getElementById('contactName'),
    contactInitial: document.getElementById('contactInitial'),
    contactAvatar: document.getElementById('contactAvatar'),
    contactAvatarImg: document.getElementById('contactAvatarImg'),
    viewProfileBtn: document.getElementById('viewProfileBtn'),
    
    // Modals
    voiceModal: document.getElementById('voiceModal'),
    voiceTimer: document.getElementById('voiceTimer'),
    cancelVoiceBtn: document.getElementById('cancelVoiceBtn'),
    sendVoiceBtn: document.getElementById('sendVoiceBtn'),
    profileModal: document.getElementById('profileModal'),
    closeProfileBtn: document.getElementById('closeProfileBtn'),
    modalName: document.getElementById('modalName'),
    modalStatus: document.getElementById('modalStatus'),
    modalBio: document.getElementById('modalBio'),
    modalAvatar: document.getElementById('modalAvatar'),
    modalAvatarInitial: document.getElementById('modalAvatarInitial'),
    modalAvatarImg: document.getElementById('modalAvatarImg'),
    modalLastSeen: document.getElementById('modalLastSeen'),
    
    // Privacy
    privacyWarning: document.getElementById('privacyWarning')
};

// ==================== INITIALIZATION ====================

function initTheme() {
    const savedTheme = localStorage.getItem('chatTheme') || 'purple';
    document.body.setAttribute('data-theme', savedTheme);
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === savedTheme);
    });
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

function initPrivacyFeatures() {
    // Screenshot detection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab switched - enable privacy mode
            document.body.classList.add('privacy-mode');
        } else {
            // Tab visible again
            document.body.classList.remove('privacy-mode');
            // Show warning if we suspect screenshot
            showPrivacyWarning();
        }
    });
}

function showPrivacyWarning() {
    el.privacyWarning.style.display = 'flex';
    setTimeout(() => {
        el.privacyWarning.style.display = 'none';
    }, 3000);
}

// ==================== ENCRYPTION ====================

async function generateEncryptionKey(roomCode) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(roomCode + 'SECURECHAT'),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    encryptionKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('salt'),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ENCRYPTION_ALGORITHM, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptMessage(text, messageId) {
    if (!encryptionKey) return text;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ text, messageId }));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        encryptionKey,
        data
    );
    
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
}

async function decryptMessage(encrypted) {
    if (!encryptionKey || !encrypted.iv || !encrypted.data) return 'Encrypted message';
    
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: ENCRYPTION_ALGORITHM, iv: new Uint8Array(encrypted.iv) },
            encryptionKey,
            new Uint8Array(encrypted.data)
        );
        
        const decoder = new TextDecoder();
        const decoded = JSON.parse(decoder.decode(decrypted));
        return decoded;
    } catch (err) {
        console.error('Decryption error:', err);
        return 'Failed to decrypt';
    }
}

// ==================== PROFILE SETUP ====================

el.profileBio.addEventListener('input', (e) => {
    el.bioCounter.textContent = `${e.target.value.length}/150`;
});

el.profileStatus.addEventListener('input', (e) => {
    el.statusCounter.textContent = `${e.target.value.length}/50`;
});

el.uploadBtn.addEventListener('click', () => {
    el.avatarInput.click();
});

el.avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        currentUser.avatar = event.target.result;
        el.avatarImage.src = currentUser.avatar;
        el.avatarImage.style.display = 'block';
        el.avatarInitial.style.display = 'none';
    };
    reader.readAsDataURL(file);
});

el.cameraBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Take Photo</h3>
                <video autoplay style="width: 100%; border-radius: 12px; margin: 16px 0;"></video>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" id="cancelPhoto">Cancel</button>
                    <button class="btn-primary" id="takePhoto">Capture</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('video').srcObject = stream;
        
        modal.querySelector('#cancelPhoto').addEventListener('click', () => {
            stream.getTracks().forEach(track => track.stop());
            modal.remove();
        });
        
        modal.querySelector('#takePhoto').addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            const videoEl = modal.querySelector('video');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            currentUser.avatar = canvas.toDataURL('image/jpeg', 0.8);
            
            el.avatarImage.src = currentUser.avatar;
            el.avatarImage.style.display = 'block';
            el.avatarInitial.style.display = 'none';
            
            stream.getTracks().forEach(track => track.stop());
            modal.remove();
        });
    } catch (err) {
        alert('Camera access denied');
    }
});

el.profileContinueBtn.addEventListener('click', () => {
    const username = el.profileUsername.value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    currentUser.username = username;
    currentUser.bio = el.profileBio.value.trim();
    currentUser.status = el.profileStatus.value.trim() || 'Hey there!';
    
    if (!currentUser.avatar) {
        el.avatarInitial.textContent = username.charAt(0).toUpperCase();
    }
    
    localStorage.setItem('userProfile', JSON.stringify(currentUser));
    showScreen('room');
});

// Theme Selection
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('chatTheme', theme);
        
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.remove('active');
        });
        option.classList.add('active');
    });
});

// ==================== ROOM SETUP ====================

el.backToProfile.addEventListener('click', () => {
    showScreen('profile');
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

el.createRoomBtn.addEventListener('click', async () => {
    const roomCode = generateRoomCode();
    currentUser.roomCode = roomCode;
    el.roomCode.textContent = roomCode;
    generateQRCode(roomCode);
    el.waitingStatus.style.display = 'flex';
    
    await generateEncryptionKey(roomCode);
    
    socket.emit('create-room', {
        roomCode,
        username: currentUser.username,
        avatar: currentUser.avatar,
        bio: currentUser.bio,
        status: currentUser.status
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

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

async function joinRoom(roomCode) {
    currentUser.roomCode = roomCode;
    await generateEncryptionKey(roomCode);
    
    socket.emit('join-room', {
        roomCode,
        username: currentUser.username,
        avatar: currentUser.avatar,
        bio: currentUser.bio,
        status: currentUser.status
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

// ==================== CHAT ====================

el.disconnectBtn.addEventListener('click', () => leaveRoom());

function leaveRoom() {
    socket.disconnect();
    setTimeout(() => socket.connect(), 100);
    
    currentUser.roomCode = '';
    remoteUser = { username: '', avatar: null, bio: '', status: '', online: false };
    el.chatMessages.innerHTML = '<div class="date-divider"><span id="chatDate">Today</span></div>';
    el.waitingStatus.style.display = 'none';
    el.roomCode.textContent = '------';
    el.roomCodeInput.value = '';
    encryptionKey = null;
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

async function sendMessage() {
    const message = el.messageInput.value.trim();
    if (!message) return;
    
    const messageId = generateMessageId();
    const encrypted = await encryptMessage(message, messageId);
    
    socket.emit('send-message', {
        roomCode: currentUser.roomCode,
        message: encrypted,
        username: currentUser.username,
        messageId
    });
    
    addMessage(message, currentUser.username, true, Date.now(), messageId, false);
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

// File Sharing
el.fileBtn.addEventListener('click', () => {
    el.fileInput.click();
});

el.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const messageId = generateMessageId();
        const encrypted = await encryptMessage(event.target.result, messageId);
        
        socket.emit('send-file', {
            roomCode: currentUser.roomCode,
            file: encrypted,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            username: currentUser.username,
            messageId
        });
        
        addFileMessage(event.target.result, file.name, file.type, file.size, true, Date.now(), messageId);
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
});

// Voice Recording
el.voiceBtn.addEventListener('click', startVoiceRecording);
el.cancelVoiceBtn.addEventListener('click', cancelVoiceRecording);
el.sendVoiceBtn.addEventListener('click', sendVoiceNote);

async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        
        audioChunks = [];
        recordingStartTime = Date.now();
        
        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.start();
        el.voiceModal.style.display = 'flex';
        
        voiceRecordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            el.voiceTimer.textContent = `${mins}:${secs}`;
            
            if (elapsed >= 60) {
                sendVoiceNote();
            }
        }, 100);
        
    } catch (err) {
        alert('Microphone access denied');
    }
}

function cancelVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(voiceRecordingInterval);
    audioChunks = [];
    el.voiceModal.style.display = 'none';
    el.voiceTimer.textContent = '00:00';
}

async function sendVoiceNote() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                const messageId = generateMessageId();
                const encrypted = await encryptMessage(event.target.result, messageId);
                
                socket.emit('send-voice', {
                    roomCode: currentUser.roomCode,
                    voice: encrypted,
                    duration,
                    username: currentUser.username,
                    messageId
                });
                
                addVoiceMessage(event.target.result, duration, true, Date.now(), messageId);
            };
            
            reader.readAsDataURL(audioBlob);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        };
    }
    
    clearInterval(voiceRecordingInterval);
    audioChunks = [];
    el.voiceModal.style.display = 'none';
    el.voiceTimer.textContent = '00:00';
}

// View Profile
el.viewProfileBtn.addEventListener('click', () => {
    el.modalName.textContent = remoteUser.username;
    el.modalStatus.textContent = remoteUser.status || 'Hey there!';
    el.modalBio.textContent = remoteUser.bio || 'No bio set';
    
    if (remoteUser.avatar) {
        el.modalAvatarImg.src = remoteUser.avatar;
        el.modalAvatarImg.style.display = 'block';
        el.modalAvatarInitial.style.display = 'none';
    } else {
        el.modalAvatarInitial.textContent = remoteUser.username.charAt(0).toUpperCase();
        el.modalAvatarInitial.style.display = 'flex';
        el.modalAvatarImg.style.display = 'none';
    }
    
    if (remoteUser.online) {
        el.modalLastSeen.textContent = 'Online';
    } else if (remoteUser.lastSeen) {
        el.modalLastSeen.textContent = `Last seen ${formatLastSeen(remoteUser.lastSeen)}`;
    } else {
        el.modalLastSeen.textContent = 'Offline';
    }
    
    el.profileModal.style.display = 'flex';
});

el.closeProfileBtn.addEventListener('click', () => {
    el.profileModal.style.display = 'none';
});

// ==================== MESSAGE RENDERING ====================

function addMessage(text, username, isSent, timestamp, messageId, selfDestruct = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.dataset.messageId = messageId;
    
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
    time.innerHTML = `${formatTime(timestamp)} <span class="message-status">✓✓</span>`;
    bubble.appendChild(time);
    
    if (selfDestruct) {
        const expiresAt = timestamp + 24 * 60 * 60 * 1000;
        const timer = document.createElement('div');
        timer.className = 'self-destruct-timer';
        timer.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Self-destructs in ${getTimeRemaining(expiresAt)}`;
        bubble.appendChild(timer);
        messageDiv.dataset.expiresAt = expiresAt;
    }
    
    // Delete button
    if (isSent) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="message-action-btn" onclick="deleteMessage('${messageId}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
        messageDiv.appendChild(actions);
    }
    
    messageDiv.appendChild(bubble);
    el.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addFileMessage(fileData, fileName, fileType, fileSize, isSent, timestamp, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.dataset.messageId = messageId;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (!isSent) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = remoteUser.username;
        bubble.appendChild(sender);
    }
    
    if (fileType.startsWith('image/')) {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'image-message';
        imgDiv.innerHTML = `<img src="${fileData}" alt="${fileName}">`;
        bubble.appendChild(imgDiv);
    } else {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-message';
        fileDiv.innerHTML = `
            <div class="file-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
            </div>
            <div class="file-info">
                <div class="file-name">${fileName}</div>
                <div class="file-size">${formatFileSize(fileSize)}</div>
            </div>
            <button class="file-download" onclick="downloadFile('${fileData}', '${fileName}')">
                Download
            </button>
        `;
        bubble.appendChild(fileDiv);
    }
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.innerHTML = `${formatTime(timestamp)} <span class="message-status">✓✓</span>`;
    bubble.appendChild(time);
    
    messageDiv.appendChild(bubble);
    el.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addVoiceMessage(voiceData, duration, isSent, timestamp, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.dataset.messageId = messageId;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (!isSent) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = remoteUser.username;
        bubble.appendChild(sender);
    }
    
    const voiceDiv = document.createElement('div');
    voiceDiv.className = 'voice-message';
    voiceDiv.innerHTML = `
        <button class="voice-play-btn" onclick="playVoice('${voiceData}', this)">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        </button>
        <div class="voice-waveform">
            <div class="waveform-bars">
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
            </div>
        </div>
        <div class="voice-duration">${formatDuration(duration)}</div>
    `;
    bubble.appendChild(voiceDiv);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.innerHTML = `${formatTime(timestamp)} <span class="message-status">✓✓</span>`;
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

// ==================== MESSAGE ACTIONS ====================

window.deleteMessage = function(messageId) {
    socket.emit('delete-message', {
        roomCode: currentUser.roomCode,
        messageId
    });
};

window.downloadFile = function(fileData, fileName) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    link.click();
};

let currentAudio = null;
window.playVoice = function(voiceData, btn) {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio = null;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        return;
    }
    
    currentAudio = new Audio(voiceData);
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    
    currentAudio.onended = () => {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    };
    
    currentAudio.play();
};

// Self-Destruct Timer
function startSelfDestructTimer() {
    if (selfDestructInterval) clearInterval(selfDestructInterval);
    
    selfDestructInterval = setInterval(() => {
        const now = Date.now();
        document.querySelectorAll('.message[data-expires-at]').forEach(msg => {
            const expiresAt = parseInt(msg.dataset.expiresAt);
            const timer = msg.querySelector('.self-destruct-timer');
            
            if (now >= expiresAt) {
                msg.remove();
            } else if (timer) {
                timer.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Self-destructs in ${getTimeRemaining(expiresAt)}`;
            }
        });
    }, 1000);
}

// ==================== SOCKET EVENTS ====================

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('room-created', (data) => {
    console.log('Room created:', data);
    currentUser.roomCode = data.roomCode;
});

socket.on('room-joined', async (data) => {
    console.log('Room joined:', data);
    currentUser.roomCode = data.roomCode;
    showScreen('chat');
    
    if (data.users && data.users.length > 0) {
        const otherUser = data.users[0];
        remoteUser.username = otherUser.username;
        remoteUser.avatar = otherUser.avatar;
        remoteUser.bio = otherUser.bio;
        remoteUser.status = otherUser.status;
        remoteUser.online = otherUser.online;
        remoteUser.lastSeen = otherUser.lastSeen;
    }
    
    updateChatUI();
    addSystemMessage('You joined the room');
    startSelfDestructTimer();
});

socket.on('user-joined', (data) => {
    console.log('User joined:', data);
    remoteUser.username = data.username;
    remoteUser.avatar = data.avatar;
    remoteUser.bio = data.bio;
    remoteUser.status = data.status;
    remoteUser.online = true;
    
    showScreen('chat');
    updateChatUI();
    addSystemMessage(`${data.username} joined the chat`);
    startSelfDestructTimer();
});

socket.on('user-offline', (data) => {
    remoteUser.online = false;
    remoteUser.lastSeen = data.lastSeen;
    updateOnlineStatus();
});

socket.on('profile-updated', (data) => {
    remoteUser.username = data.username;
    remoteUser.avatar = data.avatar;
    remoteUser.bio = data.bio;
    remoteUser.status = data.status;
    updateChatUI();
});

socket.on('receive-message', async (data) => {
    const decrypted = await decryptMessage(data.message);
    const text = typeof decrypted === 'string' ? decrypted : decrypted.text;
    const messageId = typeof decrypted === 'object' ? decrypted.messageId : generateMessageId();
    addMessage(text, data.username, false, data.timestamp, messageId, false);
});

socket.on('receive-file', async (data) => {
    const decrypted = await decryptMessage(data.file);
    const fileData = typeof decrypted === 'string' ? decrypted : decrypted.text;
    addFileMessage(fileData, data.fileName, data.fileType, data.fileSize, false, data.timestamp, data.messageId);
});

socket.on('receive-voice', async (data) => {
    const decrypted = await decryptMessage(data.voice);
    const voiceData = typeof decrypted === 'string' ? decrypted : decrypted.text;
    addVoiceMessage(voiceData, data.duration, false, data.timestamp, data.messageId);
});

socket.on('message-deleted', (data) => {
    const msg = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
    if (msg) {
        const bubble = msg.querySelector('.message-bubble');
        bubble.innerHTML = '<div class="message-text message-deleted">Message deleted</div>';
    }
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

// ==================== UTILITY FUNCTIONS ====================

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${screen}Screen`).classList.add('active');
}

function updateChatUI() {
    el.roomCodeBadge.textContent = currentUser.roomCode;
    el.contactName.textContent = remoteUser.username || 'Waiting...';
    
    if (remoteUser.avatar) {
        el.contactAvatarImg.src = remoteUser.avatar;
        el.contactAvatarImg.style.display = 'block';
        el.contactInitial.style.display = 'none';
    } else {
        el.contactInitial.textContent = remoteUser.username ? remoteUser.username.charAt(0).toUpperCase() : '?';
        el.contactInitial.style.display = 'flex';
        el.contactAvatarImg.style.display = 'none';
    }
    
    updateOnlineStatus();
    setCurrentDate();
}

function updateOnlineStatus() {
    if (remoteUser.online) {
        el.statusText.textContent = 'Online';
        el.status.classList.add('online');
    } else if (remoteUser.lastSeen) {
        el.statusText.textContent = `Last seen ${formatLastSeen(remoteUser.lastSeen)}`;
        el.status.classList.remove('online');
    } else {
        el.statusText.textContent = 'Offline';
        el.status.classList.remove('online');
    }
}

function setCurrentDate() {
    const today = new Date();
    el.chatDate.textContent = today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatLastSeen(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTimeRemaining(expiresAt) {
    const remaining = expiresAt - Date.now();
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function scrollToBottom() {
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function generateMessageId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEmojis();
    initPrivacyFeatures();
    
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        el.profileUsername.value = profile.username;
        el.profileBio.value = profile.bio || '';
        el.profileStatus.value = profile.status || '';
        
        if (profile.avatar) {
            currentUser.avatar = profile.avatar;
            el.avatarImage.src = profile.avatar;
            el.avatarImage.style.display = 'block';
            el.avatarInitial.style.display = 'none';
        }
    }
});
