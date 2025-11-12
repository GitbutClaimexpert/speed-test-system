# Speed Test System - Render Deployment

## Files Included:
- server.js - Backend server
- package.json - Dependencies
- public/index.html - Frontend interface
- .gitignore - Git ignore file

## Deploy to Render:

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Create a new GitHub repository with these files
5. Select the repository in Render
6. Use these settings:
   - Name: speed-test-system
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
7. Click "Create Web Service"

Your app will be available at: https://your-app-name.onrender.com

## Admin Credentials:
- Username: admin
- Password: admin123
