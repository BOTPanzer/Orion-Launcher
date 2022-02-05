const { app, ipcMain, BrowserWindow, Tray, Menu, MenuItem } = require('electron')
const fs = require('fs');

let closing = false
let paused = false

let tray = null
let win = null
let win2 = null
let win3 = null

let rootFolder = null
let loadedPath = null
let launcherFolder = null

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
  launcherFolder = rootFolder+'Launcher\\'
  createWindow()
  createTray()

  app.getFileIcon('', {size:"large"}).then((fileIcon) =>{ defImage = fileIcon })

  win.webContents.on('dom-ready', function() {
    win.webContents.send('theme')

    var data = {}
    data.root = rootFolder
    data.launcher = launcherFolder

    win.webContents.send('data', data)
  })

  win.on('show', () => {
    setTimeout(() => {
      win.setOpacity(1);
    }, 200);
  });
  
  win.on('hide', () => {
    win.setOpacity(0);
  });

  win.on('resize', function () {
    var size = win.getSize()
    win.webContents.send('resized', size[0])
  })

  ipcMain.on('loaded', (event, path) => {
    loadedPath = path
    
    var size = win.getSize()
    win.webContents.send('resized', size[0])
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
  ipcMain.on('addfolder', (event) => {
    createWin2('addfolder.html', 189)

    win2.on('close', function() {
      resume()
      win2 = null
    })
  })

  ipcMain.on('addgame', (event) => {
    createWin2('addgame.html', 380)

    win2.on('close', function() {
      resume()
      win2 = null
    })
  })

  ipcMain.on('contextFile', (event, path, img) => {
    createWin2('context-file.html', 420, path, img)

    win2.on('close', function() {
      resume()
      win2 = null
    })
  })

  ipcMain.on('contextFolder', (event, path) => {
    createWin2('context-folder.html', 189, path)

    win2.on('close', function() {
      resume()
      win2 = null
    })
  })

  ipcMain.on('contextMulti', (event, paths) => {
    if (paths.length <3) createWin2('context-multi.html', 195, paths) //CORASONSITO :3
    else createWin2('context-multi.html', 215, paths)

    win2.on('close', function() {
      resume()
      win2 = null
    })
  })  
  
  ipcMain.on('exitContext', (event) => {
    closeWin2()
  })

  ipcMain.on('exitContextRefresh', (event) => {
    closeWin2()
    win.webContents.send('refreshLauncher')
  })

  ipcMain.on('exitContext2', (event) => {
    closeWin3();
    if (win2 != null)
    win2.show()
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

  ipcMain.on('remove', (event, paths) => {
    createWin3('win3.html')
    win2.hide()
    
    win3.on('close', function() {
      win3 = null
    });

    win3.webContents.send('setPaths', paths);
  })

  ipcMain.on('removefinal', (event, paths) => {
    for (i in paths) {
      let path = paths[i]
      if (fs.existsSync(path)) {
        if (fs.statSync(path).isFile()) {
          fs.unlink(path, (err) => {
            if (i == paths.length-1) {
              closeWin2()
              closeWin3()
              win.webContents.send('refreshLauncher')
            }
          })
        } else {
          const rimraf = require("rimraf");
          rimraf(path, (err) => {
            if (i == paths.length-1) {
              closeWin2()
              closeWin3()
              win.webContents.send('refreshLauncher')
            }
          })
        }
      } else if (i == paths.length-1) {
        closeWin2()
        closeWin3()
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
      win.webContents.send('loadModule', rootFolder+'Modules\\'+path, specialData)
  })

  ipcMain.on('specialData', (event, specialData) => {
    win.webContents.send('specialData', specialData)
  })

  ipcMain.on('reloadTheme', function() {
    win.reload()
  })

  ipcMain.on('newCustomWindow', (event, isFile, path) => {
    let customWin = new BrowserWindow({
      height: 540,
      width: 955
    })

    if (isFile)
      customWin.loadFile(path)
    else
      customWin.loadURL(path)

    customWin.removeMenu()
    //win.openDevTools()
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
    height: 530,
    width: 957,
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
      event.preventDefault();
      win.hide();
    } else {
      tray.destroy();
    }
  });
}

function createTray() {
  let trayMenu = new Tray(rootFolder+"Data\\Images\\icon.ico");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit Oriøn', click: function () {
        closing = true;
        app.quit();
      }
    }
  ])

  let modulesFolder = rootFolder+'Modules\\'
  if (!fs.existsSync(modulesFolder)) return
  let modulestmp = fs.readdirSync(modulesFolder);
  let modules = []
  if (modulestmp.includes('Store')) {
    modules.push('Store')
    modulestmp.splice(modulestmp.indexOf('Store'), 1);
  } if (modulestmp.includes('Launcher')) {
    modules.push('Launcher')
    modulestmp.splice(modulestmp.indexOf('Launcher'), 1);
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
    minHeight: size,
    minWidth: 390,
    maxHeight: size,
    maxWidth: 390,
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
    win2.webContents.send('load', rootFolder+'Modules/Launcher/'+file, arg1, arg2)
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
})


//WINDOW 3
function createWin3(file) {
  win3 = new BrowserWindow({
    height: 136,
    width: 390,
    minHeight: 136,
    minWidth: 390,
    maxHeight: 136,
    maxWidth: 390,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  win3.hide()
  win3.loadFile(file)
  win3.removeMenu()
  //win3.openDevTools()

  win3.webContents.on('dom-ready', () => {
    win3.show()
  })
}

function closeWin3() {
  if (win3 != null)
  win3.close()
}


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
  let jsonPath = rootFolder+'Data\\settings.json'
  let rawdata = fs.readFileSync(jsonPath)
  return JSON.parse(rawdata)
}

function updateData(json) {
  fs.writeFileSync(rootFolder+'Data\\settings.json', JSON.stringify(json));
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