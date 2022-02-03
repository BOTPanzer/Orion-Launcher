const { app, ipcMain, BrowserWindow } = require('electron')
const fs = require('fs');
let win = null
let win2 = null

function createWindow(_height, _width) {
  if (_height == null) _height = 550
  if (_width == null) _width = 1025
  win = new BrowserWindow({
    height: _height,
    width: _width,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('main.html')
  win.removeMenu()
  //win.openDevTools()
}

function createWindow2() {
  win2 = new BrowserWindow({
    height: win.getBounds().height,
    width: win.getBounds().width,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win2.loadFile('store.html')
  win2.removeMenu()
  //win2.openDevTools()
  win.close();
}

app.whenReady().then(() => {
  createWindow(null, null)

  ipcMain.on('store', (event, path) => {
    createWindow2()
  })

  ipcMain.on('launcher', (event, path) => {
    createWindow(win2.getBounds().height, win2.getBounds().width)
    win2.close();

    let dataFolder = app.getAppPath()+'\\Locations\\'
    createListFromFolder(dataFolder)
  })
  
  //START
  let dataFolder = app.getAppPath()+'\\Locations\\'
  createListFromFolder(dataFolder)

  ipcMain.on('load', (event, path) => {
    var f = fs.statSync(path);
    if (f.isFile()) {
      createListFromFile(path)
    } else if (f.isDirectory()) {
      createListFromFolder(path)
    }
  })

  function createListFromFile(argPath) {
    win.webContents.send('setLocPath', argPath, dataFolder);
    var paths = fs.readFileSync(argPath).toString().trim().split("\n");
    win.webContents.send('clearList', null);
    createBackButt(argPath)
    for(i in paths) {
      let path = paths[i].replace('\r', '')
      if (path.startsWith('?:')) path = path.replace('?:', dataFolder.substring(0, 2))
      //if (path.startsWith('?:')) path = path.replace('?:', 'E:')
      //Name
      let name = path.substring(0, path.lastIndexOf("\\"))
      name = name.substring(name.lastIndexOf("\\")+1)
      //Id
      let id = `b${i}`
      let img = `img${i}`
      //HTML
      let html = createHTML(id, img, "./Data/Images/icon_file.png", name)
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addListener', id, path, img);
      app.getFileIcon(path, {size:"large"}).then((fileIcon) =>{
        win.webContents.send('changeIcon', img, fileIcon.toDataURL());
      })
    }
  }

  function createListFromFolder(argPath) {
    win.webContents.send('setLocPath', argPath, dataFolder);
    var paths = fs.readdirSync(argPath);
    win.webContents.send('clearList', null);
    createBackButt(argPath)
    for(i in paths) {
      let path = argPath+paths[i]+'\\';
      //Name
      let name = path.substring(0, path.lastIndexOf("\\"))
      name = name.substring(name.lastIndexOf("\\")+1)
      if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
      //Id
      let id = `b${i}`
      let img = `img${i}`
      //HTML
      let html = createHTML(id, img, "./Data/Images/icon_folder.png", name)
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addReturnListener', id, path);
    }
  }
  
  function createBackButt(argPath) {
    if (argPath != dataFolder) {
      //HTML
      let html = createHTML("backButt", "backImg", "./Data/Images/icon_back.png", "Back")
      //Create
      win.webContents.send('add1ToList', html);
      let bpath = argPath
      if (bpath.endsWith("\\")) bpath = bpath.slice(0,-1)
      let numb = bpath.split("\\").length - 1
      if (numb > 1) bpath = bpath.substring(0, bpath.lastIndexOf("\\")+1)
      win.webContents.send('addReturnListener', 'backButt', bpath);
    }
  }

  function createHTML(id, img, icon, name) {
    let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./Data/Images/icon_item.png'); text-align: center; display: inline-block;">
                  <div style="width: 150px; height: 100px;">
                    <img id="${img}" class="unselectable" style="margin: 10px; max-width: 130px; height: 90px;" src="${icon}"></img>
                  </div>
                  <div style="width: 140px; height: 40px; padding: 5px">
                    <div class="unselectableDiv">
                      <div class="unselectable" style="line-height:20px; display: inline-block; max-height: 40px; width: 140px;">${name}</div>
                    </div>
                  </div>
                </div>`
    return html
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})