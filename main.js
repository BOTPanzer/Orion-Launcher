const { app, ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs');
const readline = require('readline');
let win = null

function createWindow () {
  win = new BrowserWindow({
    width: 990,
    height: 517,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
  win.removeMenu()

  
  //START
  let dataFolder = app.getAppPath()+'\\Data\\'
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
      //Name
      let name = path.substring(0, path.lastIndexOf("\\"))
      name = name.substring(name.lastIndexOf("\\")+1)
      //Id
      let id = `b${i}`
      let img = `img${i}`
      //HTML
      let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./icon_item.png'); text-align: center; display: inline-block;">
                    <div style="width: 150px; height: 100px;">
                      <img id="${img}" class="unselectable" style="margin: 10px; max-width: 90px; max-height: 90px;" src="./icon.png"></img>
                    </div>
                    <div style="width: 140px; height: 40px; padding: 5px">
                      <div class="unselectableDiv">
                        <div class="unselectable" style="line-height:20px; display: inline-block; max-height: 40px; width: 140px;">${name}</div>
                      </div>
                    </div>
                  </div>`
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addListener', id, path);
      win.webContents.send('changeImage', img, 'file');
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
      //Id
      let id = `b${i}`
      let img = `img${i}`
      //HTML
      let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./icon_item.png'); text-align: center; display: inline-block;">
                    <div style="width: 150px; height: 100px;">
                      <img id="${img}" class="unselectable" style="margin: 10px; max-width: 90px; max-height: 90px;" src="./icon.png"></img>
                    </div>
                    <div style="width: 140px; height: 40px; padding: 5px">
                      <div class="unselectableDiv">
                        <div class="unselectable" style="line-height:20px; display: inline-block;">${name}</div>
                      </div>
                    </div>
                  </div>`
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addReturnListener', id, path);
      win.webContents.send('changeImage', img, 'folder');
    }
  }
  
  function createBackButt(argPath) {
    if (argPath != dataFolder) {
      //HTML
      let html = `<div id="backButt" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./icon_item.png'); text-align: center; display: inline-block;">
                    <div style="width: 150px; height: 100px;">
                      <img class="unselectable" style="margin: 10px; max-width: 90px; max-height: 90px;" src="./icon_back.png"></img>
                    </div>
                    <div style="width: 140px; height: 40px; padding: 5px">
                      <div class="unselectableDiv">
                        <div class="unselectable" style="line-height:20px; display: inline-block; max-height: 40px; width: 140px;">Back</div>
                      </div>
                    </div>
                  </div>`
      //Create
      win.webContents.send('add1ToList', html);
      let bpath = argPath
      if (bpath.endsWith("\\")) bpath = bpath.slice(0,-1)
      let numb = bpath.split("\\").length - 1
      if (numb > 1) bpath = bpath.substring(0, bpath.lastIndexOf("\\")+1)
      win.webContents.send('addReturnListener', 'backButt', bpath);
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})