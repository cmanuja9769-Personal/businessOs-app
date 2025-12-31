# BusinessOS Desktop App

## 🎉 Electron Integration Complete!

Your Next.js app is now ready to run as a desktop application with full authentication support.

## 🚀 Development

**Start the desktop app in development mode:**
```bash
npm run electron:dev
```

This will:
1. Start Next.js dev server on http://localhost:3000
2. Wait for the server to be ready
3. Launch Electron window with DevTools

## 📦 Building Desktop Apps

### Important: Build First
Before building the Electron app, build your Next.js app:
```bash
npm run build
```

### Windows
```bash
npm run electron:build:win
```
Creates:
- `BusinessOS-1.0.0-x64.exe` (NSIS installer)
- `BusinessOS-1.0.0-x64-portable.exe` (portable)

### macOS
```bash
npm run electron:build:mac
```
Creates:
- `BusinessOS-1.0.0.dmg` (disk image)
- `BusinessOS-1.0.0-mac.zip` (archive)

### Linux
```bash
npm run electron:build:linux
```
Creates:
- `BusinessOS-1.0.0-x86_64.AppImage`
- `BusinessOS-1.0.0-amd64.deb`

### All Platforms
```bash
npm run electron:build
```

## 📁 Output Location

Built apps will be in: `dist/`

## ✨ Features

### Application Menu
- **File Menu**: New Invoice (Ctrl+N), Exit (Ctrl+Q)
- **View Menu**: Reload, DevTools, Zoom controls, Fullscreen
- **Navigation Menu**: 
  - Dashboard
  - Invoices (Ctrl+I)
  - Customers (Ctrl+Shift+C)
  - Items (Ctrl+M)
  - Reports (Ctrl+Shift+R)
- **Help Menu**: Documentation, About

### Window Features
- 1400x900 default size (minimum 1024x768)
- Custom app icon support
- External links open in default browser
- Auto-reload on changes (dev mode)
- DevTools available (dev mode)
- Full authentication with Supabase

## 🔧 Configuration Files

- `electron/main.js` - Main Electron process with Next.js server management
- `electron/preload.js` - Secure IPC bridge for navigation
- `electron-builder.json` - Build configuration for all platforms
- `next.config.mjs` - Standard Next.js config (no static export)

## 📝 Important Notes

### Server Architecture
The app runs a **local Next.js server** inside Electron:
- ✅ Full Next.js features (SSR, API routes, server actions)
- ✅ Supabase authentication with cookies
- ✅ All dynamic features work
- ✅ Automatic server startup in production builds

### Development vs Production
- **Development**: External Next.js dev server (started by concurrently)
- **Production**: Embedded Next.js production server (started by Electron)

### Authentication
- Uses Supabase with cookie-based auth
- Works seamlessly in both dev and production
- No special configuration needed

## 🎨 Customization

### App Icon
1. Create a 512x512 PNG icon
2. Save as `public/icon.png`
3. For production builds, use platform-specific icons:
   - Windows: `.ico` file
   - macOS: `.icns` file
   - Linux: `.png` files

### App Name & ID
Edit `electron-builder.json`:
```json
{
  "appId": "com.yourcompany.businessos",
  "productName": "Your App Name"
}
```

### Window Size
Edit `electron/main.js`:
```javascript
const mainWindow = new BrowserWindow({
  width: 1600,  // Your width
  height: 1000  // Your height
})
```

### Port Configuration
Default port is 3000. To change it, edit `electron/main.js`:
```javascript
const PORT = 3001 // Your custom port
```

And update `package.json`:
```json
"electron:dev": "concurrently \"cross-env NODE_ENV=development PORT=3001 next dev\" \"wait-on http://localhost:3001 && cross-env NODE_ENV=development electron .\""
```

## 🐛 Troubleshooting

**"waiting for http://localhost:3000"**
- Make sure port 3000 is not in use
- Try stopping other Node processes
- Check if Next.js dev server starts successfully

**Build fails**
- Run `npm run build` first to verify Next.js builds
- Check all dependencies are installed: `npm install`
- Ensure `.env.local` has correct Supabase credentials

**App won't start in production**
- Verify Next.js build exists: Check `.next/` folder
- Test with `npm start` first before electron build
- Check console logs for errors

**Authentication issues**
- Verify `.env.local` has correct Supabase URL and anon key
- Check Supabase project is active
- Ensure cookies are enabled in Electron (they are by default)

## 🚢 Distribution

### Before Release
1. Test thoroughly in development mode
2. Test production build on your OS: `npm run build && npm start`
3. Create platform-specific icons
4. Update app metadata in `electron-builder.json`
5. Build for target platforms

### Code Signing (Recommended for Production)
**Windows:**
- Get code signing certificate from trusted CA
- Configure in `electron-builder.json`:
  ```json
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "your-password"
  }
  ```

**macOS:**
- Apple Developer account required
- Set up code signing identity in Xcode
- Configure in `electron-builder.json`:
  ```json
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
  ```

**Linux:**
- No code signing required

### Auto Updates (Future Enhancement)
Can be implemented using `electron-updater`:
1. Install: `npm install electron-updater`
2. Set up update server (GitHub Releases recommended)
3. Add update checking logic to `main.js`

## 💡 Tips & Best Practices

1. **Always test in dev mode first**: `npm run electron:dev`
2. **Build Next.js before Electron**: Prevents stale code in builds
3. **Test on actual target OS**: VMs or CI/CD recommended
4. **Keep dependencies updated**: Run `npm update` regularly
5. **Monitor app size**: Use `electron-builder` size reports
6. **Bundle environment variables carefully**: Don't expose secrets

## 📊 Build Size Optimization

To reduce app size:
1. Use `asar` archiving (enabled by default)
2. Exclude unnecessary files in `electron-builder.json`:
   ```json
   "files": [
     ".next/**/*",
     "electron/**/*",
     "public/**/*",
     "package.json"
   ]
   ```
3. Remove dev dependencies from production
4. Consider using `electron-builder`'s compression

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 🔐 Security Considerations

- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Preload script for secure IPC
- ✅ External links open in browser
- ✅ Navigation restricted to localhost
- ⚠️ Ensure environment variables don't expose secrets
- ⚠️ Use HTTPS for Supabase in production

---

**Ready to launch!** Run `npm run electron:dev` to start developing. 🚀

Need help? Check the troubleshooting section or create an issue on GitHub.

