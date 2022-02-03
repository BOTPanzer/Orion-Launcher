const { app, ipcMain, BrowserWindow, dialog } = require('electron')
const fs = require('fs');
let window = 'launcher'
let win = null


function createWindow(_height, _width) {
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
      win.webContents.send('changeText', actualPath);
    }
  });

  
  //FUNCTIONS LAUNCHER
  let dataFolder = app.getAppPath()+'\\Launcher\\'
  let actualPath = dataFolder
  
  ipcMain.on('load', (event, path) => {
    createList(path)
  })

  ipcMain.on('delFile', (event, path) => {
    delFile(path)
  })

  ipcMain.on('delFolder', (event, path) => {
    delFolder(path)
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
            if (err) {
              console.error(err)
              return
            }
            createList(actualPath)
          })
        }
      } else createList(actualPath)
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
            if (err) {
              console.error(err)
              return
            }
            createList(actualPath)
          })
        }
      } else createList(actualPath)
    }

    delWin()
  }

  function createList(argPath) {
    win.webContents.send('setbutt');
    win.webContents.send('setLocPath', argPath, dataFolder);
    var paths = fs.readdirSync(argPath);
    win.webContents.send('clearList', null);
    createBackButt(argPath)
    //FIRST FOLDERS THEN FILES
    let folders = []
    let files = []
    for(i in paths) {
      let path = argPath+paths[i]+'\\';
      if (fs.statSync(path).isFile()) {
        files.push(paths[i])
      } else {
        folders.push(paths[i])
      }
    }
    let allPaths = []
    for(i in folders) {
      allPaths.push(folders[i])
    }
    for(i in files) {
      allPaths.push(files[i])
    }
    //START
    for(i in allPaths) {
      let path = argPath+allPaths[i]+'\\';
      //Name
      let name = path.substring(0, path.lastIndexOf("\\"))
      name = name.substring(name.lastIndexOf("\\")+1)
      if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
      //Id
      let id = `b${i}`
      let img = `img${i}`
      //Default Image
      let image = "./Data/Images/icon_folder.png"
      if (fs.statSync(path).isFile()) image = "./Data/Images/icon_file.png"
      //HTML
      let html = createHTML(id, img, image, name)
      //Create
      win.webContents.send('add1ToList', html);
      if (fs.statSync(path).isFile()) {
        let si = fs.readFileSync(path).toString().trim().split('\n')
        var filePath = si[0]
        if (filePath.endsWith('\r')) filePath = filePath.slice(0,-1)
        if (filePath.startsWith('?:')) filePath = filePath.replace('?:', dataFolder.substring(0, 2))
        //if (filePath.startsWith('?:')) filePath = filePath.replace('?:', 'E:')
        win.webContents.send('addListener', id, path, filePath, name, img);
        //Image
        var iconPath = si[1]
        if (iconPath != undefined) {
          if (iconPath.endsWith('\r')) iconPath = iconPath.slice(0,-1)
          app.getFileIcon(iconPath, {size:"large"}).then((fileIcon) =>{ 
            win.webContents.send('changeIcon', img, fileIcon.toDataURL()) 
          })
        } else {
          app.getFileIcon(filePath, {size:"large"}).then((fileIcon) =>{ 
            win.webContents.send('changeIcon', img, fileIcon.toDataURL()) 
          })
        }
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
  
  //FUNCTIONS LAUNCHER CREATOR
  ipcMain.on('b1', (event, name) => {
    let fullName = actualPath+name.trim()
    if (!fs.existsSync(fullName)) {
      fs.mkdirSync(fullName);
      win.webContents.send('log', `Game "${name}" Added`);
    }
  })

  ipcMain.on('getFile', (event) => {
    dialog.showOpenDialog({
      title: "Choose a Game",
      properties: ['openFile'],
    }).then((files)=>{
      let file = files.filePaths[0]
      if (file == undefined) {
        console.log("No file selected");
      } else {
        win.webContents.send('fileGotten', file);
      }
    }).catch(err=>console.log('Handle Error',err))
  })

  ipcMain.on('getFileIcon', (event) => {
    dialog.showOpenDialog({
      title: "Choose a Game",
      properties: ['openFile'],
    }).then((files)=>{
      let file = files.filePaths[0]
      if (file == undefined) {
        console.log("No file selected");
      } else {
        win.webContents.send('fileGottenIcon', file);
      }
    }).catch(err=>console.log('Handle Error',err))
  })

  ipcMain.on('b3', (event, name, path, icon) => {
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
    win.webContents.send('si', 'Elamigos');
    win.webContents.send('si', 'Fitgirl');
    win.webContents.send('si', 'Pivi');
    win.webContents.send('si', 'Skidrow');

    let search = orSearch.replaceAll(' ', '+')

    let fullURL = 'https://www.elamigos-games.com/?q='+search
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

    fullURL = 'https://www.skidrowcodex.net/game-list/'
    if (search != '') 
    getHTML(fullURL).then(function(result) {
      skidrow(result, orSearch)
    })
    else win.webContents.send('no', 'Skidrow');
  })

  function elamigos(result) {
    let part = result.substring(result.indexOf('<div class="col-lg-2 '), result.indexOf('<!-- /.row -->'))
    var si = part.split('<div class="col-lg-2 ')
    var links = []
    var imgs = []
    var names = []
    //LINKS & IMAGES
    for(i in si) {
      if (links.length == 10) break
      let link = si[i].substring(si[i].indexOf('href="')+6)
      link = link.substring(0, link.indexOf('"'))
      let img = si[i].substring(si[i].indexOf('src="')+5)
      img = 'https://www.elamigos-games.com'+img.substring(0, img.indexOf('"'))
      if (link != '' && img != '' && link.startsWith('https://www.elamigos-games.com')) {
        links.push(link)
        imgs.push(img)
      }
    }
    //NAMES
    for(i in links) {
      let name = links[i].substring(links[i].lastIndexOf("/")+1, links[i].length)
      name = name.replaceAll('-', ' ')
      names.push(titleCase(name))
    }
    //ADD GAMES
    for(i in links) {
      let id = `elamigos${i}`
      let img = imgs[i]
      let link = links[i]
      let name = names[i]
      let html = createHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listElamigos');
      win.webContents.send('addListener', id, link);
    }
    if (links.length == 0) win.webContents.send('no', 'Elamigos');
  }

  async function fitgirl(result) {
    if (!result.includes('<article class="post')) {
      win.webContents.send('no', 'Fitgirl');
      return
    }
    let part = result.substring(result.indexOf('<article class="post'), result.indexOf('<nav class="navigation paging-navigation"'))
    var si = part.split('<article class="post')
    var links = []
    var names = []
    //LINKS
    for(i in si) {
      if (links.length == 10) break
      if (si[i].includes('href="https://fitgirlrepacks.co/repack')) {
        let link = si[i].substring(si[i].indexOf('href="https://fitgirlrepacks.co/repack')+6)
        link = link.substring(0, link.indexOf('"'))
        if (link != '') {
          links.push(link)
        }
      }
    }
    //NAMES
    for(i in links) {
      let name = links[i].substring(links[i].lastIndexOf("/")+1, links[i].length)
      name = name.substring(name.indexOf("-")+1, name.length)
      name = name.replaceAll('-', ' ')
      names.push(titleCase(name))
    }
    //ADD GAMES
    for(i in links) {
      let id = `fitgirl${i}`
      let link = links[i]
      let name = names[i]
      let img = await fitgirlImg(link)
      let html = createHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listFitgirl');
      win.webContents.send('addListener', id, link);
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
    let part = result.substring(result.indexOf('<div id="gp-content-wrapper"')) //remove top bar
    part = part.substring(part.indexOf('<section class="gp-post-item gp-standard-post'))
    var si = part.split('<section')
    var links = []
    var imgs = []
    var names = []
    //LINKS & IMAGES
    for(i in si) {
      if (links.length == 10) break
      if (!si[i].includes('https://pivigames.blog/estrenos') && !si[i].includes('https://pivigames.blog/tops') && !si[i].includes('https://pivigames.blog/promociones') && !si[i].includes('https://pivigames.blog/oferta')) {
        let link = si[i].substring(si[i].indexOf('href="')+6)
        link = link.substring(0, link.indexOf('"')-1)
        let img = si[i].substring(si[i].indexOf('src="')+5)
        img = img.substring(0, img.indexOf('"'))
        if (link != '' && img != '' && link.startsWith('https://pivigames.blog/')&& !links.includes(link)) {
          links.push(link)
          imgs.push(img)
        }
      }
    }
    //NAMES
    for(i in links) {
      let name = links[i].substring(links[i].lastIndexOf("/")+1, links[i].length)
      name = name.replaceAll('-', ' ')
      names.push(titleCase(name))
    }
    //ADD GAMES
    for(i in links) {
      let id = `pivi${i}`
      let img = imgs[i]
      let link = links[i]
      let name = names[i]
      let html = createHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listPivi');
      win.webContents.send('addListener', id, link);
    }
    if (links.length == 0) win.webContents.send('no', 'Pivi');
  }

  function skidrow(result, search) {
    let part = result.substring(result.indexOf('<h2 style="text-align: center;">'), result.indexOf('<footer class="container">'))
    var si = part.split('<li >')
    var links = []
    var names = []
    //LINKS & NAMES
    for(i in si) {
      if (links.length == 10) break
      if (!si[i].includes('href="') && !si[i].includes('title="')) continue
      let link = si[i].substring(si[i].indexOf('href="')+6)
      link = link.substring(0, link.indexOf('"')-1)
      let name = si[i].substring(si[i].indexOf('title="')+7)
      name = name.substring(0, name.indexOf('"'))
      if (link != '' && name != '') {
        if (name.toLowerCase().includes(search.toLowerCase())) {
          links.push(link)
          names.push(name)
        }
      }
    }
    //ADD GAMES
    for(i in links) {
      let id = `skidrow${i}`
      let link = links[i]
      let name = names[i]
      let html = createHTML(id, null, './Data/Images/icon_file.png', name)
      win.webContents.send('add1ToList', html, 'listSkidrow');
      win.webContents.send('addListener', id, link);
    }
    if (links.length == 0) win.webContents.send('no', 'Skidrow');
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


  //FUNCTIONS ALL
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
})