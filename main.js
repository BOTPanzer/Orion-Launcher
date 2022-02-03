const { app, ipcMain, BrowserWindow, dialog } = require('electron')
const fs = require('fs');
const { tmpdir } = require('os');
let window = 'launcher'
let win = null
let win2 = null
let dataFolder = null
let actualPath = null


function createWindow() {
  win = new BrowserWindow({
    height: 550,
    width: 1036,
    minHeight: 491,
    minWidth: 881,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  win.loadFile('main.html')
  win.removeMenu()
  //win.openDevTools()
  window = 'launcher'
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(() => {
  createWindow()

  win.on('close', function() {
    closeWin2()
  });

  ipcMain.on('launcher', (event) => {
    win.loadFile('main.html')
    window = 'launcher'
  })

  ipcMain.on('store', (event) => {
    win.loadFile('store.html')
    window = 'store'
  })

  ipcMain.on('add', (event) => {
    win.loadFile('add.html')
    window = 'add'
  })

  win.webContents.on('dom-ready', () => {
    if (window == 'launcher') {
      createList(actualPath)
    } else if (window == 'store') {
      
    } else if (window == 'add') {
      win.webContents.send('start', actualPath, dataFolder);
    }
  });


  //FUNCTIONS LAUNCHER
  dataFolder = app.getAppPath()+'\\Launcher\\'
  actualPath = dataFolder
  
  ipcMain.on('load', (event, path) => {
    createList(path)
  })

  function createList(argPath) {
    if (!argPath.endsWith('\\')) argPath = argPath+'\\'
    if (!fs.existsSync(argPath)) return
    win.webContents.send('setbutt');
    win.webContents.send('setLocPath', argPath, dataFolder);
    win.webContents.send('clearList');
    createBackButt(argPath)
    //FIRST FOLDERS THEN FILES
    let folders = []
    let files = []
    let paths = fs.readdirSync(argPath);
    for(i in paths) {
      let path = argPath+paths[i];
      if (fs.statSync(path).isFile()) {
        files.push(paths[i])
      } else {
        folders.push(paths[i])
      }
    }
    let allPaths = []
    for(i in folders) { allPaths.push(folders[i]) }
    for(i in files) { allPaths.push(files[i]) }
    //START
    
    for(i in allPaths) {
      //Data
      let path = argPath+allPaths[i]
      let data = getFileInfo(path)
      let isFile = data.isFile
      let name = data.name
      let gamePath = data.gamePath
      let iconPath = data.iconPath
      //Id
      let id = path+i
      let img = `img${i}`
      //Default Image
      let image = "./Data/Images/icon_folder.png"
      if (isFile) image = "./Data/Images/icon_file.png"
      //HTML
      let html = createHTML(id, img, image, name)
      //Create
      win.webContents.send('add1ToList', html);
      if (isFile) {
        if (iconPath != undefined) {
          win.webContents.send('addListener', id, img, path, name, gamePath, iconPath);
        } else {
          win.webContents.send('addListener', id, img, path, name, gamePath, '');
          if (gamePath.startsWith('"') && !gamePath.endsWith('"')) {
            iconPath = gamePath.substring(1, gamePath.lastIndexOf('"'))
          } else {
            iconPath = gamePath
          }
        }
        app.getFileIcon(iconPath, {size:"large"}).then((fileIcon) =>{ 
          win.webContents.send('changeIcon', img, fileIcon.toDataURL()) 
        })
      } else{
        win.webContents.send('addFolderListener', id, path);
      }
    }
    actualPath = argPath
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
      win.webContents.send('addFolderListener', 'backButt', bpath);
    }
  }

  ipcMain.on('showOnExplorer', (event, path) => {
    const { shell } = require('electron');
    if (fs.existsSync(path)) {
      shell.showItemInFolder(path)
    }
  })


  //FUNCTIONS LAUNCHER CONTEXT
  ipcMain.on('contextFile', (event, path, name, filePath, iconPath) => {
    createWin2()

    win2.on('close', function() {
      createList(actualPath)
      win2 = null
    });

    win2.webContents.send('setLocation', path);
    //Name
    win2.webContents.send('setName', name);
    win2.webContents.send('setPath', filePath);
    win2.webContents.send('setIconPath', iconPath);
  })

  ipcMain.on('contextFolder', (event, path) => {
    createWin2()

    win2.on('close', function() {
      createList(actualPath)
      win2 = null
    });

    win2.webContents.send('setLocation', path);
    //Name
    let name = path.substring(0, path.lastIndexOf("\\"))
    name = name.substring(name.lastIndexOf("\\")+1)
    if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
    win2.webContents.send('setName', name);
    win2.webContents.send('setPath', undefined);
    win2.webContents.send('setIconPath', undefined);
  })

  function createWin2() {
    win2 = new BrowserWindow({
      height: 400,
      width: 404,
      minHeight: 500,
      minWidth: 404,
      maxHeight: 500,
      maxWidth: 404,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })

    win2.loadFile('context.html')
    win2.removeMenu()
    //win2.openDevTools()
  }

  ipcMain.on('getFileContext', async function() {
    win2.webContents.send('fileGotten', await getFile("Choose a Game"));
  })

  ipcMain.on('getFileIconContext', async function() {
    win2.webContents.send('fileGottenIcon', await getFile("Choose a Game"));
  })

  ipcMain.on('move', async function(event, path) {
    if (fs.existsSync(path)) {
      let newFilePath = await getFolder("Choose a Folder")+'\\'
      if (!newFilePath.includes(dataFolder)) return
      let oldFilePath = path
      if (path.endsWith('\\')) oldFilePath = path.slice(0,-1)
      let name = oldFilePath.substring(oldFilePath.lastIndexOf('\\')+1)
      fs.rename(path, newFilePath+name, function(err) {
        closeWin2()
        createList(actualPath)
      })
    }
  })

  ipcMain.on('remove', (event, path) => {
    if (fs.statSync(path).isFile()) {
      delFile(path)
    } else {
      delFolder(path)
    }
  })

  function delFile(path) {
    let name = path.substring(0, path.lastIndexOf("\\"))
    name = name.substring(name.lastIndexOf("\\")+1)
    if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
    const options = {
      icon: __dirname+'.\\Data\\Images\\icon.ico',
      buttons: ['Yes', 'No'],
      title: 'Oriøn: Launcher',
      message: 'Remove Game?',
      detail: 'Game: '+name,
    };

    const delWin = async () => {
      let response = await dialog.showMessageBox(options)
      if (response.response == 0) {
        if (fs.existsSync(path)) {
          fs.unlink(path, (err) => {
            closeWin2()
            createList(actualPath)
          })
        }
      }
    }

    delWin()
  }

  function delFolder(path) {
    let name = path.substring(0, path.lastIndexOf("\\"))
    name = name.substring(name.lastIndexOf("\\")+1)
    const options = {
      icon: __dirname+'.\\Data\\Images\\icon.ico',
      buttons: ['Yes', 'No'],
      title: 'Oriøn: Launcher',
      message: 'Remove Folder?',
      detail: 'Folder: '+name,
    };

    const delWin = async () => {
      const rimraf = require("rimraf");
      let response = await dialog.showMessageBox(options)
      if (response.response == 0) {
        if (fs.existsSync(path)) {
          rimraf(path, (err) => {
            closeWin2()
            createList(actualPath)
          })
        }
      }
    }

    delWin()
  }

  ipcMain.on('save', (event, path, newName, newPath, newIcon) => {
    if (fs.existsSync(path)) {
      fs.writeFile(path, newPath+'\n'+newIcon, (err) => {
        if (newName != undefined) {
          if (fs.statSync(path).isFile()) {
            let newFilePath = actualPath+newName+'.txt'
            fs.rename(path, newFilePath, function(err) {
              closeWin2()
              createList(actualPath)
            })
          } else {
            let newFilePath = actualPath+newName
            fs.rename(path, newFilePath, function(err) {
              closeWin2()
              createList(actualPath)
            })
          }
        } else {
          closeWin2()
          createList(actualPath)
        }
      })
    }
  })

  
  //FUNCTIONS LAUNCHER CREATOR
  ipcMain.on('getFile', async function() {
    win.webContents.send('fileGotten', await getFile("Choose a Game"));
  })

  ipcMain.on('getFileIcon', async function() {
    win.webContents.send('fileGottenIcon', await getFile("Choose a Game"));
  })

  ipcMain.on('addFolder', (event, name) => {
    let fullName = actualPath+name.trim()
    if (!fs.existsSync(fullName)) {
      fs.mkdirSync(fullName);
      win.webContents.send('log', `Folder "${name}" Added`);
    }
  })

  ipcMain.on('addGame', (event, name, path, icon) => {
    let fullName = actualPath+name.trim()+'.txt'
    let data = path
    if (icon != '') data = path+'\n'+icon
    if (!fs.existsSync(fullName)) {
      fs.writeFile(fullName, data, (err) => {
        win.webContents.send('log', `Game "${name}" Added`);
      })
    }
  })


  //FUNCTIONS STORE
  ipcMain.on('searchGames', (event, orSearch) => {
    win.webContents.send('clearList');
    win.webContents.send('searchingResults', 'Elamigos');
    win.webContents.send('searchingResults', 'Fitgirl');
    win.webContents.send('searchingResults', 'Pivi');
    win.webContents.send('searchingResults', 'Skidrow');

    let search = orSearch.replaceAll(' ', '+')

    let fullURL = 'https://www.elamigos-games.com/?q='+search
    if (search == '') fullURL = 'https://www.elamigos-games.com/'
    getHTML(fullURL).then(function(result) {
      elamigos(result)
    })

    fullURL = 'https://fitgirlrepacks.co/search/'+search
    if (search == '' || search.length < 3) fullURL = 'https://fitgirlrepacks.co/'
    getHTML(fullURL).then(function(result) {
      fitgirl(result)
    })

    fullURL = 'https://pivigames.blog/?s='+search
    if (search == '') fullURL = 'https://pivigames.blog/'
    getHTML(fullURL).then(function(result) {
      pivi(result)
    })

    getHTML('https://www.skidrowcodex.net/game-list/').then(function(result) {
      skidrow(result, orSearch)
    })
  })

  function elamigos(result) {
    win.webContents.send('clearList', 'listElamigos');
    let part = result.substring(result.indexOf('<div class="col-lg-2 '), result.indexOf('<!-- /.row -->'))
    var si = part.split('<div class="col-lg-2 ')
    var links = []
    var names = []
    var imgs = []
    //LINKS & NAMES & IMAGES
    for(i in si) {
      if (links.length == 12) break
      let tmp = si[i].substring(si[i].lastIndexOf('href="')+6)
      tmp = tmp.substring(0, tmp.indexOf('<'))
      let link = tmp.substring(0, tmp.indexOf('"'))
      let name = tmp.substring(tmp.indexOf('>')+1)
      let img = si[i].substring(si[i].indexOf('src="')+5)
      img = 'https://www.elamigos-games.com'+img.substring(0, img.indexOf('"'))
      if (link != '' && img != '' && link.startsWith('https://www.elamigos-games.com')) {
        links.push(link)
        names.push(titleCase(name))
        imgs.push(img)
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'Elamigos');
    else win.webContents.send('hasResults', 'Elamigos');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `elamigos${i}`
      let img = imgs[i]
      let link = links[i]
      let name = names[i]
      let html = createHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listElamigos');
      win.webContents.send('addListener', id, link);
    }
  }

  function fitgirl(result) {
    if (!result.includes('<article class="post')) {
      win.webContents.send('noResults', 'Fitgirl');
      return
    }

    win.webContents.send('clearList', 'listFitgirl');
    let part = result.substring(result.indexOf('<article class="post'), result.indexOf('<nav class="navigation paging-navigation"'))
    var si = part.split('<article class="post')
    var links = []
    var names = []
    //LINKS & NAMES
    for(i in si) {
      if (si[i].includes('href="https://fitgirlrepacks.co/repack')) {
        let link = si[i].substring(si[i].indexOf('href="https://fitgirlrepacks.co/repack')+6)
        link = link.substring(0, link.indexOf('"'))
        let name = si[i].substring(si[i].indexOf('rel="bookmark">')+15)
        name = name.substring(0, name.indexOf('<'))
        if (link != '' && name != '' && name != 'Upcoming repacks') {
          links.push(link)
          names.push(titleCase(name))
        }
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'Fitgirl');
    else win.webContents.send('hasResults', 'Fitgirl');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `fitgirl${i}`
      let link = links[i]
      let name = names[i]
      let img = i+link
      let html = createHTML(id, img, './Data/Images/icon_file.png', name)
      win.webContents.send('add1ToList', html, 'listFitgirl');
      win.webContents.send('addListener', id, link);
      //IMAGE
      fitgirlImg(link).then((image) =>{ 
        win.webContents.send('changeIcon', img, image) 
      }) 
    }

    async function fitgirlImg(link) {
      const superagent = require('superagent');
      const response = await superagent.get(link)
      let html = response.text
      
      let img = html.substring(html.indexOf('<h1 class="entry-title">'))
      img = img.substring(img.indexOf('src="')+5)
      img = img.substring(0, img.indexOf('"'))
      return img
    }
  }

  function pivi(result) {
    win.webContents.send('clearList', 'listPivi');
    let part = result.substring(result.indexOf('<div id="gp-content-wrapper"')) //remove top bar
    part = part.substring(part.indexOf('<section class="gp-post-item gp-standard-post'))
    var si = part.split('<section')
    var links = []
    var names = []
    var imgs = []
    //LINKS & NAMES & IMAGES
    for(i in si) {
      let tmp = si[i].toLowerCase()
      if (!tmp.includes('>estrenos<') && !tmp.includes('>tops<') && !tmp.includes('>promociones<') && !tmp.includes('>oferta<')) {
        let link = si[i].substring(si[i].indexOf('href="')+6)
        link = link.substring(0, link.indexOf('"')-1)
        let name = si[i].substring(si[i].indexOf('title="')+7)
        name = name.substring(0, name.indexOf('"'))
        let img = si[i].substring(si[i].indexOf('src="')+5)
        img = img.substring(0, img.indexOf('"'))
        if (link != '' && name != '' && img != '' && link.startsWith('https://pivigames.blog/') && !links.includes(link)) {
          links.push(link)
          names.push(titleCase(name))
          imgs.push(img)
        }
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'Pivi');
    else win.webContents.send('hasResults', 'Pivi');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `pivi${i}`
      let img = imgs[i]
      let link = links[i]
      let name = names[i]
      let html = createHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listPivi');
      win.webContents.send('addListener', id, link);
    }
  }

  function skidrow(result, search) {
    win.webContents.send('clearList', 'listSkidrow');
    let part = result.substring(result.indexOf('<h2 style="text-align: center;">'), result.indexOf('<footer class="container">'))
    var si = part.split('<li >')
    var links = []
    var names = []
    //LINKS & NAMES W/ SEARCH
    if (search != '')
    for(i in si) {
      if (links.length == 12) break
      if (!si[i].includes('href="') && !si[i].includes('title="')) continue
      let link = si[i].substring(si[i].indexOf('href="')+6)
      link = link.substring(0, link.indexOf('"')-1)
      let name = si[i].substring(si[i].indexOf('title="')+7)
      name = name.substring(0, name.indexOf('"'))
      if (link != '' && name != '') {
        if (name.toLowerCase().includes(search.toLowerCase())) {
          links.push(link)
          names.push(titleCase(name))
        }
      }
    }
    //LINKS & NAMES NO SEARCH
    if (search == '') {
      let tmpi = 12
      var ranNumbs = []
      while (tmpi > 0) {
        getNumb()
        function getNumb() { addNumb(Math.floor(Math.random() * (si.length - 1) + 1)) }
        function addNumb(numb) {
          if (!ranNumbs.includes(numb)) {
            ranNumbs.push(numb)
            tmpi = tmpi-1
          } else getNumb()
        }
      }
      for(i in ranNumbs) {
        if (!si[ranNumbs[i]].includes('href="') && !si[ranNumbs[i]].includes('title="')) continue
        let link = si[ranNumbs[i]].substring(si[ranNumbs[i]].indexOf('href="')+6)
        link = link.substring(0, link.indexOf('"')-1)
        let name = si[ranNumbs[i]].substring(si[ranNumbs[i]].indexOf('title="')+7)
        name = name.substring(0, name.indexOf('"'))
        if (link != '' && name != '') {
          links.push(link)
          names.push(titleCase(name))
        }
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'Skidrow');
    else win.webContents.send('hasResults', 'Skidrow');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `skidrow${i}`
      let link = links[i]
      let name = names[i]
      let img = i+link
      let html = createHTML(id, img, './Data/Images/icon_file.png', name)
      win.webContents.send('add1ToList', html, 'listSkidrow');
      win.webContents.send('addListener', id, link);
      //IMAGE
      skidrowImg(link).then((image) =>{ 
        win.webContents.send('changeIcon', img, image) 
      }) 
    }

    async function skidrowImg(link) {
      const superagent = require('superagent');
      const response = await superagent.get(link)
      let html = response.text
      
      let img = html.substring(html.indexOf('<div id="post'))
      img = img.substring(img.indexOf('src="')+5)
      img = img.substring(0, img.indexOf('"'))
      return img
    }
  }

  async function getHTML(url) {
    const superagent = require('superagent');
    const response = await superagent.get(url)
    return response.text
  }

  function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
  }
})

//FUNCTIONS ALL
function getFileInfo(argPath) {
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
      if (gamePath.startsWith('?:')) gamePath = gamePath.replace('?:', dataFolder.substring(0, 2))
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

function createHTML(id, img, icon, name) {
  let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./Data/Images/icon_item.png'); text-align: center; display: inline-block;">
                <div style="width: 150px; height: 100px;">
                  <img id="${img}" class="unselectable" style="margin: 10px; max-width: 130px; height: 90px;" src="${icon}"></img>
                </div>
                <div style="width: 140px; height: 40px; padding: 5px">
                  <div class="unselectableDiv">
                    <div class="unselectable" style="line-height:20px; display: inline-block; max-height: 40px; width: 140px; white-space: normal;">${name}</div>
                  </div>
                </div>
              </div>`
  return html
}

function closeWin2() {
  if (win2 != null)
  win2.close()
}

async function getFile(title) {
  let result = await dialog.showOpenDialog({
    title: title,
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

async function getFolder(title) {
  let result = await dialog.showOpenDialog({
    title: title,
    defaultPath: dataFolder,
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