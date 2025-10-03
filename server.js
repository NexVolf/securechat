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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('create-room', (data) => {
        const { roomCode, username } = data;
        socket.join(roomCode);
        
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, []);
        }
        rooms.get(roomCode).push({ id: socket.id, username });
        
        socket.emit('room-created', { roomCode });
        console.log(`${username} created room: ${roomCode}`);
    });
    
    socket.on('join-room', (data) => {
        const { roomCode, username } = data;
        
        if (!rooms.has(roomCode)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const roomUsers = rooms.get(roomCode);
        
        socket.join(roomCode);
        roomUsers.push({ id: socket.id, username });
        
        socket.to(roomCode).emit('user-joined', { 
            username,
            userId: socket.id,
            users: roomUsers
        });
        
        socket.emit('room-joined', { 
            roomCode,
            users: roomUsers 
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
        const { roomCode, file, fileName, fileType, fileSize, username } = data;
        socket.to(roomCode).emit('receive-file', { 
            file,
            fileName,
            fileType,
            fileSize,
            username,
            timestamp: Date.now()
        });
    });
    
    socket.on('typing', (data) => {
        const { roomCode, isTyping, username } = data;
        socket.to(roomCode).emit('user-typing', { 
            isTyping, 
            username 
        });
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        rooms.forEach((users, roomCode) => {
            const index = users.findIndex(u => u.id === socket.id);
            if (index !== -1) {
                const username = users[index].username;
                users.splice(index, 1);
                
                if (users.length === 0) {
                    rooms.delete(roomCode);
                } else {
                    socket.to(roomCode).emit('user-left', { username, users });
                    io.to(roomCode).emit('users-update', { users });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
