# SecureChat - Real-time P2P Messaging

Modern WhatsApp-like chat application with Socket.IO for instant messaging.

## 🚀 Quick Start

### Method 1: Run Locally (Recommended for Testing)

1. **Install Node.js** (if not installed)
   - Download from: https://nodejs.org/

2. **Open Terminal/Command Prompt in this folder**
   - Right-click folder → "Open in Terminal" (Windows 11)
   - OR navigate: `cd C:\Users\shrey\OneDrive\Desktop\msg`

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Server**
   ```bash
   npm start
   ```

5. **Open Browser**
   - Go to: `http://localhost:3000`
   - Share this URL with others on same WiFi

### Method 2: Deploy Online (For Internet Access)

#### Option A: Deploy to Glitch (Free & Easy)
1. Go to: https://glitch.com/
2. Sign up/Login
3. Click "New Project" → "Import from GitHub"
4. Upload these files: `server.js`, `package.json`, `index.html`, `style.css`, `script.js`
5. Your app will be live at: `https://your-project-name.glitch.me`
6. Share this URL with anyone!

#### Option B: Deploy to Render (Free)
1. Go to: https://render.com/
2. Sign up/Login
3. Click "New" → "Web Service"
4. Connect GitHub or upload files
5. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Deploy and share the URL!

#### Option C: Deploy to Railway (Free)
1. Go to: https://railway.app/
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Select this folder
5. Your app will be live!

## 📱 How to Use

1. **Enter Your Name** - Start by entering your username
2. **Create Room** - Generate a 6-digit code
3. **Share Code** - Send code to friend (or show QR code)
4. **Friend Joins** - They enter the code
5. **Chat!** - Start messaging instantly

## ✨ Features

- ✅ Real-time messaging with Socket.IO
- ✅ Works over Internet (not just local)
- ✅ Room-based connections
- ✅ QR Code sharing
- ✅ Emoji picker
- ✅ Typing indicators
- ✅ Modern WhatsApp-like UI
- ✅ Fully responsive
- ✅ Fast & reliable

## 🔧 Troubleshooting

**Server won't start?**
- Make sure Node.js is installed
- Run `npm install` first

**Can't connect?**
- Check if server is running
- Both users must use the same server URL
- Check firewall settings

**Deploy issues?**
- Make sure all files are uploaded
- Check server logs for errors

## 📂 Files

- `server.js` - Socket.IO server
- `index.html` - Main HTML
- `style.css` - Styling
- `script.js` - Client logic
- `package.json` - Dependencies

---

Made with ❤️ for instant messaging
