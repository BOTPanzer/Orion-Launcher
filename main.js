const { app, ipcMain, BrowserWindow, Tray, Menu, MenuItem } = require('electron')
const fs = require('fs');

let closing = false
let paused = false

let tray = null
let win = null
let win2 = null
let win3 = null

let rootFolder = null
let dataFolder = null
let modulesFolder = null

let launcherModule = null
let launcherFolder = null
let currentModule = null

let defImage = null


if (!app.requestSingleInstanceLock()) {
  closing = true;
  app.quit();
} else app.whenReady().then(() => {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win && (win.isMinimized() || !win.isVisible()))
      win.show();
  })


  // /$$      /$$  /$$$$$$  /$$$$$$ /$$   /$$
  //| $$$    /$$$ /$$__  $$|_  $$_/| $$$ | $$
  //| $$$$  /$$$$| $$  \ $$  | $$  | $$$$| $$
  //| $$ $$/$$ $$| $$$$$$$$  | $$  | $$ $$ $$
  //| $$  $$$| $$| $$__  $$  | $$  | $$  $$$$
  //| $$\  $ | $$| $$  | $$  | $$  | $$\  $$$
  //| $$ \/  | $$| $$  | $$ /$$$$$$| $$ \  $$
  //|__/     |__/|__/  |__/|______/|__/  \__/

  rootFolder = app.getAppPath()+'\\'
  dataFolder = rootFolder+'Data\\'
  modulesFolder = rootFolder+'Modules\\'

  launcherModule = modulesFolder+'Library\\'
  launcherFolder = launcherModule+'Launcher\\'

  createWindow()
  createTray()

  app.getFileIcon('', {size:"large"}).then((fileIcon) =>{ defImage = fileIcon })

  win.webContents.on('dom-ready', function() {
    win.webContents.send('theme')

    var data = {}
    data.root = rootFolder
    data.data = dataFolder
    data.modules = modulesFolder

    win.webContents.send('data', data)
  })

  win.on('show', () => {
    setTimeout(() => {
      win.setOpacity(1);
    }, 200);
  })
  
  win.on('hide', () => {
    win.setOpacity(0);
  })

  win.on('resize', function () {
    win.webContents.send('resized', win.getSize())
  })

  ipcMain.on('loaded', (event, path) => {
    currentModule = path
    
    win.webContents.send('resized', win.getSize())
  })

  //MINI & MAXI & EXIT
  ipcMain.on('mini', (event) => {
    win.minimize();
  })

  ipcMain.on('maxi', (event) => {
    if (!win.isMaximized()) {
      win.maximize();          
    } else {
      win.unmaximize();
    }
  })

  ipcMain.on('exit', (event) => {
    win.close();
  })

  //PAUSE & RESUME
  ipcMain.on('pause', (event) => {
    pause()
  })

  function pause() {
    win.webContents.send('pause')
    paused = true
  }

  ipcMain.on('resume', (event) => {
    resume()
  })

  function resume() {
    paused = false
    win.webContents.send('resume')
  }


  //  /$$$$$$   /$$$$$$  /$$   /$$ /$$$$$$$$ /$$$$$$$$ /$$   /$$ /$$$$$$$$
  // /$$__  $$ /$$__  $$| $$$ | $$|__  $$__/| $$_____/| $$  / $$|__  $$__/
  //| $$  \__/| $$  \ $$| $$$$| $$   | $$   | $$      |  $$/ $$/   | $$   
  //| $$      | $$  | $$| $$ $$ $$   | $$   | $$$$$    \  $$$$/    | $$   
  //| $$      | $$  | $$| $$  $$$$   | $$   | $$__/     >$$  $$    | $$   
  //| $$    $$| $$  | $$| $$\  $$$   | $$   | $$       /$$/\  $$   | $$   
  //|  $$$$$$/|  $$$$$$/| $$ \  $$   | $$   | $$$$$$$$| $$  \ $$   | $$   
  // \______/  \______/ |__/  \__/   |__/   |________/|__/  |__/   |__/   

  //WINDOWS
  ipcMain.on('createContext', (event, context, arg1, arg2) => {
    switch(context) {
      case 'addfolder':
        createWin2('addfolder.html', 189)

        win2.on('close', function() {
          resume()
          win2 = null
        })
        break
      case 'addgame':
        createWin2('addgame.html', 380)

        win2.on('close', function() {
          resume()
          win2 = null
        })
        break
      case 'contextFile':
        createWin2('context-file.html', 420, arg1, arg2)

        win2.on('close', function() {
          resume()
          win2 = null
        })
        break
      case 'contextFolder':
        createWin2('context-folder.html', 189, arg1)

        win2.on('close', function() {
          resume()
          win2 = null
        })
        break
      case 'contextMulti':
        if (arg1.length <3) createWin2('context-multi.html', 195, arg1) //CORASONSITO :3
        else createWin2('context-multi.html', 215, arg1)
    
        win2.on('close', function() {
          resume()
          win2 = null
        })
        break
    }
  })
  
  ipcMain.on('exitContext', (event, refresh) => {
    closeWin2()
    if (refresh) win.webContents.send('refreshLauncher')
  }) 
  
  ipcMain.on('resizeContext', async function(event, height) {
    win2.setResizable(true)
    win2.setSize(390, height)
    win2.setResizable(false)
    win2.center()
  })

  //FUNCTIONS
  ipcMain.on('requestIcon2', async function(event, argPath, path) {
    requestIcon2(argPath, path)
  })

  ipcMain.on('getFile2', async function(event, path, title, sendReturn) {
    if (title == undefined || title == '') title = 'Choose a File'
    if (fs.existsSync(path)) win2.webContents.send(sendReturn, await getFile(title, path))
    else win2.webContents.send(sendReturn, await getFile(title))
  })

  ipcMain.on('move', async function(event, paths) {
    let newFilePath = await getFolder("Choose a Folder", launcherFolder)+'\\'
    if (!newFilePath.includes(launcherFolder)) return

    //CHECK IF NEW FOLDER IS ALSO BEING MOVED
    let posibleToMove = true
    for (i in paths) {
      if (newFilePath.includes(paths[i]))
      posibleToMove = false
    }

    //IF NOT MOVE ヾ(•ω•`)o
    if (posibleToMove)
    for (i in paths) {
      let path = paths[i]
      if (fs.existsSync(path)) {
        let oldFilePath = path
        if (path.endsWith('\\')) oldFilePath = path.slice(0,-1)
        let name = oldFilePath.substring(oldFilePath.lastIndexOf('\\')+1)
        fs.rename(path, newFilePath+name, function(err) {
          if (i == paths.length-1) {
            closeWin2()
            win.webContents.send('refreshLauncher')
          }
        })
      } else if (i == paths.length-1) {
        closeWin2()
        win.webContents.send('refreshLauncher')
      }
    }
  })

  ipcMain.on('removefinal', (event, paths) => {
    for (i in paths) {
      let path = paths[i]
      if (fs.existsSync(path)) {
        if (fs.statSync(path).isFile()) {
          fs.unlink(path, (err) => {
            if (i == paths.length-1) {
              closeWin2()
              win.webContents.send('refreshLauncher')
            }
          })
        } else {
          const rimraf = require("rimraf");
          rimraf(path, (err) => {
            if (i == paths.length-1) {
              closeWin2()
              win.webContents.send('refreshLauncher')
            }
          })
        }
      } else if (i == paths.length-1) {
        closeWin2()
      }
    }
  })

  ipcMain.on('save', (event, path, newName, newPath, newIcon) => {
    //NO NAME >:|
    if (newName == '') {
      win2.webContents.send('log', 'Name Is Necesary');
      return
    }
    if (fs.existsSync(path)) {
      let json = getData()
      let actualPath = json.actualPath
      //SAVE FILE OR FOLDER
      if (fs.statSync(path).isFile()) {
        //NO PATH
        if (newPath == '') {
          win2.webContents.send('log', 'Path Is Necesary');
          return
        }
        fs.writeFile(path, newPath+'\n'+newIcon, (err) => {
          if (newName != undefined) {
            let newFilePath = actualPath+newName+'.txt'
            if (fs.existsSync(newFilePath)) {
              win2.webContents.send('log', 'File Already Exists');
              return
            }
            fs.rename(path, newFilePath, function(err) {
              closeWin2()
              win.webContents.send('refreshLauncher')
            })
          } else {
            closeWin2()
            win.webContents.send('refreshLauncher')
          }
        })
      } else {
        if (newName != undefined) {
          let newFilePath = actualPath+newName
          if (fs.existsSync(newFilePath)) {
            win2.webContents.send('log', 'Folder Already Exists');
            return
          }
          fs.rename(path, newFilePath, function(err) {
            closeWin2()
            win.webContents.send('refreshLauncher')
          })
        } else {
          closeWin2()
          win.webContents.send('refreshLauncher')
        }
      }
    }
  })


  //  /$$$$$$  /$$$$$$$$ /$$   /$$ /$$$$$$$$ /$$$$$$$ 
  // /$$__  $$|__  $$__/| $$  | $$| $$_____/| $$__  $$
  //| $$  \ $$   | $$   | $$  | $$| $$      | $$  \ $$
  //| $$  | $$   | $$   | $$$$$$$$| $$$$$   | $$$$$$$/
  //| $$  | $$   | $$   | $$__  $$| $$__/   | $$__  $$
  //| $$  | $$   | $$   | $$  | $$| $$      | $$  \ $$
  //|  $$$$$$/   | $$   | $$  | $$| $$$$$$$$| $$  | $$
  // \______/    |__/   |__/  |__/|________/|__/  |__/

  ipcMain.on('loadModule', (event, path, specialData) => {
    if (fs.existsSync(path))
      win.webContents.send('loadModule', path, specialData)
    else
      win.webContents.send('loadModule', modulesFolder+path, specialData)
  })

  ipcMain.on('specialData', (event, specialData) => {
    win.webContents.send('specialData', specialData)
  })

  ipcMain.on('reloadTheme', function() {
    win.reload()
  })

  ipcMain.on('newCustomWindow', (event, path, isFile, isResizable, hasFrame, height, width, specialData) => {
    if (path == undefined) return
    if (isFile == undefined) isFile = false
    if (isResizable == undefined) isResizable = true
    if (hasFrame == undefined) hasFrame = true
    if (height == undefined) height = 540
    if (width == undefined) width = 955

    let options = {
      height: height,
      width: width,
      resizable: isResizable,
      frame: hasFrame,
    }

    let customWin = new BrowserWindow(options)
    customWin.removeMenu()
    //customWin.openDevTools()

    if (isFile)
      customWin.loadFile(path)
    else
      customWin.loadURL(path)

    customWin.on('close', function (event) {})

    customWin.webContents.on('dom-ready', () => {})
  })

  ipcMain.on('requestIcon', (event, img, iconPath, actualPath) => {
    app.getFileIcon(iconPath, {size:"large"}).then((fileIcon) =>{
      if (defImage != fileIcon.toDataURL()) 
        win.webContents.send('changeIcon', img, fileIcon.toDataURL(), actualPath)
      else app.getFileIcon('', {size:"normal"}).then((fileIcon) =>{ 
        if (defImage != fileIcon.toDataURL()) 
          win.webContents.send('changeIcon', img, fileIcon.toDataURL(), actualPath)
      })
    })
  })

  ipcMain.on('getFile', async function(event, path, title, sendReturn) {
    if (title == undefined || title == '') title = 'Choose a File'
    if (fs.existsSync(path)) win.webContents.send(sendReturn, await getFile(title, path))
    else win.webContents.send(sendReturn, await getFile(title))
  })

  ipcMain.on('getFolder', async function(event, path, title, sendReturn) {
    if (title == undefined || title == '') title = 'Choose a Folder'
    if (fs.existsSync(path)) win.webContents.send(sendReturn, await getFolder(title, path))
    else win.webContents.send(sendReturn, await getFolder(title))
  })

  ipcMain.on('showOnExplorer', (event, path, show) => {
    const { shell } = require('electron');
    if (show == true)
      shell.showItemInFolder(path)
    else
      shell.openPath(path)
  })
})


//WINDOW 1
function createWindow() {
  win = new BrowserWindow({
    height: 550,
    width: 962,
    minHeight: 460,
    minWidth: 800,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  win.loadFile('main.html')
  win.removeMenu()
  //win.openDevTools()

  win.on('close', function (event) {
    if (!closing) {
      event.preventDefault()
      win.hide()
    } else {
      tray.destroy()
    }
  })
}

function createTray() {
  let trayMenu = new Tray(dataFolder+'Images\\icon.ico');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit Oriøn', click: function () {
        closing = true;
        app.quit();
      }
    }
  ])

  if (!fs.existsSync(modulesFolder)) return
  let modulestmp = fs.readdirSync(modulesFolder);
  let modules = []
  if (modulestmp.includes('Store')) {
    modules.push('Store')
    modulestmp.splice(modulestmp.indexOf('Store'), 1);
  } if (modulestmp.includes('Library')) {
    modules.push('Library')
    modulestmp.splice(modulestmp.indexOf('Library'), 1);
  } if (modulestmp.includes('Themes')) {
    modules.push('Themes')
    modulestmp.splice(modulestmp.indexOf('Themes'), 1);
  } if (modulestmp.includes('Installer')) {
    modules.push('Installer')
    modulestmp.splice(modulestmp.indexOf('Installer'), 1);
  } if (modulestmp.includes('Connect')) {
    modules.push('Connect')
    modulestmp.splice(modulestmp.indexOf('Connect'), 1);
  }
  for(i in modulestmp) {
    modules.push(modulestmp[i])
  }
  for(i in modules) {
    //DATA
    let name = modules[modules.length-i-1]
    let path = modulesFolder+name

    let options = {
      label: name, 
      click: function () {
        if (paused) return
        win.webContents.send('loadModule', path)
        if (win.isMinimized() || !win.isVisible())
        win.show();
      }
    }
    const item = new MenuItem(options)
    contextMenu.insert(0, item)
  }

  trayMenu.on('double-click', function (event) {
    win.show();
  })

  trayMenu.setToolTip('Oriøn Launcher')
  trayMenu.setContextMenu(contextMenu)
  tray = trayMenu
}


//WINDOW 2
function createWin2(file, size, arg1, arg2) {
  win2 = new BrowserWindow({
    height: size,
    width: 390,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })
  
  win2.hide()
  win2.loadFile('win2.html')
  win2.removeMenu()
  //win2.openDevTools()

  win2.webContents.on('dom-ready', () => {
    win2.webContents.send('load', launcherModule+file, arg1, arg2)
    win2.show()
  })
}

function closeWin2() {
  if (win2 != null)
  win2.close()
}

function requestIcon2(argPath, path) {
  if (fs.existsSync(path) && fs.statSync(path).isFile()) {
    if (path.toLowerCase().endsWith('.exe')) {
      app.getFileIcon(path, {size:"large"}).then((fileIcon) =>{
        if (defImage != fileIcon.toDataURL()) {
          win2.webContents.send('changeIcon', argPath, fileIcon.toDataURL())
        }
      })
    } else {
      win2.webContents.send('changeIcon', argPath, path)
    }
  }
}

ipcMain.on('loaded2', (event, window, arg1, arg2) => {
  if (window == 'addfolder.html' || window == 'addgame.html') {
    let json = getData()
    win2.webContents.send('setLocation', json.actualPath);
  } else if (window == 'context-folder.html') {
    win2.webContents.send('setLocation', arg1)
    let name = arg1.substring(arg1.lastIndexOf("\\")+1)
    win2.webContents.send('setName', name)
    win2.webContents.send('setPath', undefined)
    win2.webContents.send('setIconPath', undefined)
  } else if (window == 'context-file.html') {
    let data = getFileInfo(arg1, false)
    let name = data.name
    let gamePath = data.gamePath
    let iconPath = data.iconPath
    if (iconPath == undefined) iconPath = ''

    if (iconPath == '')
      requestIcon2(arg1, gamePath)
    else
      requestIcon2(arg1, iconPath)

    win2.webContents.send('setLocation', arg1, arg2)
    win2.webContents.send('setName', name)
    win2.webContents.send('setPath', gamePath)
    win2.webContents.send('setIconPath', iconPath)
  } else if (window == 'context-multi.html') {
    win2.webContents.send('setPaths', arg1)
  }
  let size = win2.getSize()
  win2.webContents.send('height', size[1])
})


//OTHER
function getFileInfo(argPath, fixed) {
  if (fixed == undefined) fixed = true
  let path = argPath
  if (path.endsWith('\\')) path = path.slice(0,-1)
  //isFile
  let isFile = false
  if (fs.statSync(argPath).isFile()) isFile = true
  //Name
  let name = argPath.substring(argPath.lastIndexOf("\\")+1)
  if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
  //File Stuff
  if (isFile) {
    let si = fs.readFileSync(argPath).toString().trim().split('\n')
    //Path
    let gamePath = si[0]
    if (gamePath != undefined) {
      gamePath = gamePath.replaceAll('\r', '')
      if (gamePath.startsWith('?:') && fixed) gamePath = gamePath.replace('?:', rootFolder.substring(0, 2))
    }
    //Icon
    let iconPath = si[1]
    if (iconPath != undefined) {
      iconPath = iconPath.replaceAll('\r', '')
    }
    let data = {isFile, name, gamePath, iconPath}
    return data
  } else {
    let data = {isFile, name}
    return data
  }
}

function getData() {
  let jsonPath = dataFolder+'settings.json'
  let rawdata = fs.readFileSync(jsonPath)
  return JSON.parse(rawdata)
}


//GET FILE & FOLDER
async function getFile(title, path) {
  const { dialog } = require('electron')
  if (path == undefined) path = ''
  let result = await dialog.showOpenDialog({
    title: title,
    defaultPath: path,
    properties: ['openFile'],
  }).then(function(files) {
    let file = files.filePaths[0]
    if (file == undefined) {
      return ''
    } else {
      return file
    }
  })
  return result
}

async function getFolder(title, path) {
  const { dialog } = require('electron')
  if (path == undefined) path = ''
  let result = await dialog.showOpenDialog({
    title: title,
    defaultPath: path,
    properties: ['openDirectory'],
  }).then(function(files) {
    let file = files.filePaths[0]
    if (file == undefined) {
      return ''
    } else {
      return file
    }
  })
  return result
}