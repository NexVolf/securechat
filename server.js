const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10e6
});

app.use(express.static('.'));

const rooms = new Map();
const userProfiles = new Map();
const userStatus = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('update-profile', (data) => {
        const { username, avatar, bio, status } = data;
        userProfiles.set(socket.id, { username, avatar, bio, status });
        userStatus.set(socket.id, { online: true, lastSeen: Date.now() });
        
        rooms.forEach((users, roomCode) => {
            if (users.some(u => u.id === socket.id)) {
                io.to(roomCode).emit('profile-updated', {
                    userId: socket.id,
                    username,
                    avatar,
                    bio,
                    status,
                    online: true
                });
            }
        });
    });
    
    socket.on('create-room', (data) => {
        const { roomCode, username, avatar, bio, status } = data;
        userProfiles.set(socket.id, { username, avatar, bio, status });
        userStatus.set(socket.id, { online: true, lastSeen: Date.now() });
        socket.join(roomCode);
        
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, []);
        }
        rooms.get(roomCode).push({ id: socket.id, username });
        
        socket.emit('room-created', { roomCode });
        console.log(`${username} created room: ${roomCode}`);
    });
    
    socket.on('join-room', (data) => {
        const { roomCode, username, avatar, bio, status } = data;
        
        if (!rooms.has(roomCode)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        userProfiles.set(socket.id, { username, avatar, bio, status });
        userStatus.set(socket.id, { online: true, lastSeen: Date.now() });
        
        const roomUsers = rooms.get(roomCode);
        
        socket.join(roomCode);
        const userProfile = userProfiles.get(socket.id);
        roomUsers.push({ id: socket.id, ...userProfile });
        
        const otherUserProfiles = roomUsers
            .filter(u => u.id !== socket.id)
            .map(u => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar,
                bio: u.bio,
                status: u.status,
                online: userStatus.get(u.id)?.online || false,
                lastSeen: userStatus.get(u.id)?.lastSeen || Date.now()
            }));
        
        socket.to(roomCode).emit('user-joined', { 
            username,
            userId: socket.id,
            avatar,
            bio,
            status,
            users: roomUsers,
            online: true
        });
        
        socket.emit('room-joined', { 
            roomCode,
            users: otherUserProfiles
        });
        
        io.to(roomCode).emit('users-update', { users: roomUsers });
        
        console.log(`${username} joined room: ${roomCode} (${roomUsers.length} users)`);
    });
    
    socket.on('send-message', (data) => {
        const { roomCode, message, username } = data;
        socket.to(roomCode).emit('receive-message', { 
            message, 
            username,
            timestamp: Date.now()
        });
    });
    
    socket.on('send-file', (data) => {
        const { roomCode, file, fileName, fileType, fileSize, username, messageId } = data;
        socket.to(roomCode).emit('receive-file', { 
            file,
            fileName,
            fileType,
            fileSize,
            username,
            messageId,
            timestamp: Date.now()
        });
    });
    
    socket.on('send-voice', (data) => {
        const { roomCode, voice, duration, username, messageId } = data;
        socket.to(roomCode).emit('receive-voice', {
            voice,
            duration,
            username,
            messageId,
            timestamp: Date.now()
        });
    });
    
    socket.on('delete-message', (data) => {
        const { roomCode, messageId } = data;
        io.to(roomCode).emit('message-deleted', { messageId });
    });
    
    socket.on('typing', (data) => {
        const { roomCode, isTyping, username } = data;
        socket.to(roomCode).emit('user-typing', { 
            isTyping, 
            username 
        });
    });
    
    socket.on('user-activity', (data) => {
        if (userStatus.has(socket.id)) {
            userStatus.get(socket.id).lastSeen = Date.now();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (userStatus.has(socket.id)) {
            userStatus.get(socket.id).online = false;
            userStatus.get(socket.id).lastSeen = Date.now();
        }
        
        rooms.forEach((users, roomCode) => {
            const index = users.findIndex(u => u.id === socket.id);
            if (index !== -1) {
                const username = users[index].username;
                
                socket.to(roomCode).emit('user-offline', { 
                    userId: socket.id,
                    username, 
                    lastSeen: Date.now()
                });
                
                users.splice(index, 1);
                
                if (users.length === 0) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('users-update', { users });
                }
            }
        });
        
        setTimeout(() => {
            userProfiles.delete(socket.id);
            userStatus.delete(socket.id);
        }, 60000);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
