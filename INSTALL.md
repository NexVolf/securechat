# 📦 Installation Guide

## Prerequisites

Make sure you have **Node.js** installed on your computer.

**Check if Node.js is installed:**
```bash
node --version
npm --version
```

**Don't have Node.js?**
Download from: https://nodejs.org/ (LTS version recommended)

---

## 🚀 Installation Steps

### **Step 1: Check if node_modules exists**

Look for a `node_modules` folder in the project directory:
- ✅ **If it exists** → Skip to Step 3
- ❌ **If it doesn't exist** → Continue to Step 2

---

### **Step 2: Install Dependencies**

Open terminal/command prompt in the project folder and run:

```bash
npm install
```

**What this does:**
- Downloads all required packages
- Creates `node_modules` folder
- Creates `package-lock.json` file

**Packages installed:**
- `express` - Web server
- `socket.io` - Real-time communication

**This takes 30-60 seconds** ⏱️

---

### **Step 3: Start the Server**

```bash
npm start
```

You should see:
```
Server running on port 3000
Open http://localhost:3000 in your browser
```

---

### **Step 4: Open in Browser**

Go to:
```
http://localhost:3000
```

**You're all set! 🎉**

---

## 🔧 Troubleshooting

### **Error: `npm` is not recognized**
- Node.js is not installed
- Install from https://nodejs.org/
- Restart terminal after installation

### **Error: `EADDRINUSE`**
- Port 3000 is already in use
- Close other apps using port 3000
- Or change port in `server.js`

### **Error: `Cannot find module`**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`
- Run `npm install` fresh

### **Server won't start**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 📱 Testing

### **Test on Same Computer:**

1. Open in 2 different browsers:
   - Browser 1: Chrome
   - Browser 2: Firefox/Edge

2. Both go to: `http://localhost:3000`

3. Create profile on both

4. Browser 1: Create room
5. Browser 2: Join with code

6. Start chatting!

### **Test on Different Devices (Same WiFi):**

1. Find your computer's IP address:

**Windows:**
```bash
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

2. On other device, open:
```
http://YOUR_IP:3000
# Example: http://192.168.1.100:3000
```

---

## 🎯 Quick Commands

```bash
# Install dependencies (first time only)
npm install

# Start server (every time)
npm start

# Stop server
Ctrl + C (in terminal)

# Update dependencies
npm update

# Check for issues
npm audit
```

---

## 📁 Folder Structure After Install

```
msg/
├── node_modules/        ← Dependencies (created by npm install)
├── package.json         ← Project config
├── package-lock.json    ← Dependency versions (created by npm install)
├── server.js            ← Backend server
├── index.html           ← Frontend UI
├── style.css            ← Styles
├── script.js            ← Frontend logic
└── README.md            ← Documentation
```

---

## ✅ Checklist

Before starting:
- [ ] Node.js installed
- [ ] Terminal/Command Prompt open in project folder
- [ ] `npm install` completed successfully
- [ ] `npm start` running without errors
- [ ] Browser open at `http://localhost:3000`
- [ ] App loads and shows welcome screen

**All checked? You're ready! 🚀**

---

## 🆘 Need Help?

1. Check error messages in terminal
2. Read error carefully
3. Google the error message
4. Make sure Node.js version is 14+ (`node --version`)
5. Try clean install (delete node_modules, reinstall)

---

**Made with ❤️ by Shreyansh**
