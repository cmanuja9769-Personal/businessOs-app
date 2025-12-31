const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null
let nextServer = null
const PORT = 3000

// Temporarily disabled single instance lock for debugging
// const gotTheLock = app.requestSingleInstanceLock()
// if (!gotTheLock) {
//   console.log('Another instance is already running. Quitting...')
//   app.quit()
//   process.exit(0)
// }
// app.on('second-instance', (event, commandLine, workingDirectory) => {
//   if (mainWindow) {
//     if (mainWindow.isMinimized()) mainWindow.restore()
//     mainWindow.focus()
//   }
// })

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, the server is started externally via concurrently
      resolve()
      return
    }

    // In production, start the Next.js standalone server
    console.log('Starting Next.js server...')
    
    let serverPath
    let cwd
    let nodePath

    if (app.isPackaged) {
      serverPath = path.join(process.resourcesPath, 'app', '.next/standalone/server.js')
      cwd = path.join(process.resourcesPath, 'app', '.next/standalone')
      // Use the bundled node.exe from resources
      nodePath = path.join(process.resourcesPath, 'node.exe')
    } else {
      serverPath = path.join(__dirname, '../.next/standalone/server.js')
      cwd = path.join(__dirname, '../.next/standalone')
      nodePath = 'node'
    }
    
    console.log('Node path:', nodePath)
    console.log('Server path:', serverPath)
    console.log('Working directory:', cwd)
    
    // Use spawn with node executable
    const next = spawn(nodePath, [serverPath], {
      cwd,
      env: {
        PORT: PORT.toString(),
        HOSTNAME: 'localhost',
        NODE_ENV: 'production'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let serverReady = false

    next.stdout.on('data', (data) => {
      console.log(`Next.js: ${data.toString()}`)
    })

    next.stderr.on('data', (data) => {
      console.error(`Next.js stderr: ${data.toString()}`)
    })

    next.on('error', (error) => {
      console.error('Failed to start Next.js:', error)
      if (!serverReady) {
        reject(error)
      }
    })

    next.on('exit', (code, signal) => {
      console.log(`Next.js exited with code ${code}, signal ${signal}`)
      if (!serverReady) {
        reject(new Error(`Next.js server exited with code ${code}`))
      } else {
        // Server was ready but then crashed - close the app
        console.error('Next.js server crashed after startup')
        app.quit()
      }
    })

    nextServer = next

    // Wait for port to be available instead of parsing logs
    const maxAttempts = 30
    let attempts = 0
    
    const checkServer = () => {
      const http = require('http')
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log('Next.js server is ready!')
          serverReady = true
          resolve()
        }
      })
      
      req.on('error', () => {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 200)
        } else {
          console.log('Server check timeout - assuming ready')
          serverReady = true
          resolve()
        }
      })
      
      req.end()
    }
    
    // Start checking after brief delay
    setTimeout(checkServer, 500)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#ffffff',
    show: false,
  })

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Load the app - always use localhost server
  mainWindow.loadURL(`http://localhost:${PORT}`)
  
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent navigation away from localhost
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Create application menu
  createMenu()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/invoices/new')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Dashboard',
          click: () => mainWindow?.webContents.send('navigate', '/')
        },
        {
          label: 'Invoices',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('navigate', '/invoices')
        },
        {
          label: 'Customers',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('navigate', '/customers')
        },
        {
          label: 'Items',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow?.webContents.send('navigate', '/items')
        },
        {
          label: 'Reports',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.send('navigate', '/reports')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/yourusername/businessos')
        },
        { type: 'separator' },
        {
          label: 'About BusinessOS',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About BusinessOS',
              message: 'BusinessOS v1.0.0',
              detail: 'Professional Business Management Software\nInventory, Billing & Customer Management',
              buttons: ['OK']
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    await startNextServer()
    createWindow()
  } catch (error) {
    console.error('Failed to start application:', error)
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application server.\n\nError: ${error.message}\n\nPlease check if port ${PORT} is available.`
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  // Clean up the Next.js server
  if (nextServer) {
    nextServer.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  // Ensure Next.js server is terminated
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
})

// Handle app updates (optional - for future implementation)
app.on('ready', () => {
  console.log('BusinessOS Desktop started')
})
