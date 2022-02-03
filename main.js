const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron')
const fs = require('fs');
let closing = false
let tray = null
let window = ''
let win = null
let win2 = null
let dataFolder = null
let launcherFolder = null
let actualPath = null
var theme = []


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

if (!app.requestSingleInstanceLock()) {
  closing = true;
  app.quit();
} else app.whenReady().then(() => {
  //SECOND INSTANCES
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized() || !win.isVisible())
      win.show();
    }
  })


  //ARGS
  let startArg = app.commandLine.getSwitchValue("start")
  startArg = startArg.replaceAll('|', ' ')


  //WINDOWS
  createWindow()

  win.on('close', function() {
    closeWin2()
  })

  ipcMain.on('launcher', (event) => {
    if (window == 'launcher') return
    win.webContents.send('load', 'launcher.html')
    window = 'launcher'
  })

  ipcMain.on('store', (event) => {
    if (window == 'store') return
    win.webContents.send('load', 'store.html')
    window = 'store'
  })

  ipcMain.on('themes', (event) => {
    if (window == 'themes') return
    win.webContents.send('load', 'themes.html')
    window = 'themes'
  })

  ipcMain.on('loaded', (event) => {
    win.webContents.send('theme', theme)
    if (window == 'launcher') {
      createList(actualPath)
    } else if (window == 'store') {
      searchGames('')
    } else if (window == 'add') {
      win.webContents.send('start', actualPath, launcherFolder);
    } else if (window == 'themes') {
      createThemeList()
    }
  })

  win.webContents.on('dom-ready', function() {
    updateTheme()
    if (window == '') {
      win.webContents.send('load', 'launcher.html')
      window = 'launcher'
    }
  });

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

  ipcMain.on('exitContext', (event) => {
    closeWin2();
  })


  //FUNCTIONS LAUNCHER
  dataFolder = app.getAppPath()+'\\Data\\'
  launcherFolder = app.getAppPath()+'\\Launcher\\'
  actualPath = launcherFolder
  if (startArg != '') {
    actualPath = launcherFolder+startArg
    if (!fs.existsSync(actualPath)) actualPath = launcherFolder
  }
  tray = createTray()
  
  ipcMain.on('loadPath', (event, path, search) => {
    createList(path, search)
  })

  function createList(argPath, search) {
    if (search == undefined) search = ''
    if (!argPath.endsWith('\\')) argPath = argPath+'\\'
    if (!fs.existsSync(argPath)) return
    win.webContents.send('setbutt')
    win.webContents.send('setSearch', search)
    win.webContents.send('setLocPath', argPath, launcherFolder, search)
    win.webContents.send('clearList')
    createBackButt(argPath, search)
    //FIRST FOLDERS THEN FILES
    let folders = []
    let files = []
    let paths = []
    let tmpfiles = []

    if (search == '') {
      paths = fs.readdirSync(argPath)
      rest()
    } else {
      var recursive = require("recursive-readdir");
      recursive(argPath, function (err, files) {
        for(i in files) {
          let tmp = files[i].substring(argPath.length)
          paths.push(tmp)
        }
        rest()
      })
    }

    function rest() {
      for(i in paths) {
        let path = argPath+paths[i]
        if (fs.statSync(path).isFile()) {
          if (paths[i].toLowerCase().includes(search.toLowerCase()))
            files.push(paths[i])
        } else {
          if (paths[i].toLowerCase().includes(search.toLowerCase()))
            folders.push(paths[i])
        }
      }
      let allPaths = []
      for(i in folders) { allPaths.push(folders[i]) }
      for(i in files) { allPaths.push(files[i]) }
      //START
      actualPath = argPath
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
          let gamePathArg = getPathInfo(gamePath)
          if (iconPath != undefined) {
            win.webContents.send('addListener', id, img, path, name, gamePathArg, gamePath, iconPath)
          } else {
            win.webContents.send('addListener', id, img, path, name, gamePathArg, gamePath, '')
            iconPath = gamePathArg.pathClean
          }
          app.getFileIcon(iconPath, {size:"large"}).then((fileIcon) =>{ 
            if (actualPath == argPath) win.webContents.send('changeIcon', img, fileIcon.toDataURL()) 
          })
        } else{
          win.webContents.send('addFolderListener', id, path)
        }
      }
    }
  }

  function createBackButt(argPath, search) {
    //HTML
    let html = createHTML("backButt", "backImg", "./Data/Images/icon_back.png", "Back")
    if (search == '' && argPath != launcherFolder) {
      win.webContents.send('add1ToList', html);
      //bpath
      let bpath = argPath
      if (bpath.endsWith("\\")) bpath = bpath.slice(0,-1)
      let numb = bpath.split("\\").length - 1
      if (numb > 1) bpath = bpath.substring(0, bpath.lastIndexOf("\\")+1)
      win.webContents.send('addFolderListener', 'backButt', bpath);
    } else if (search != '') {
      win.webContents.send('add1ToList', html);
      win.webContents.send('addFolderListener', 'backButt', argPath);
    }
  }

  ipcMain.on('showOnExplorer', (event, path) => {
    const { shell } = require('electron');
    shell.showItemInFolder(path)
  })


  //FUNCTIONS LAUNCHER CONTEXT
  ipcMain.on('contextFile', (event, path, name, filePath, iconPath) => {
    let gamePathArg = getPathInfo(filePath)
    showPath = gamePathArg.pathClean
    if (fs.existsSync(showPath)) {
      createWin2('context.html', 421)
    } else {
      createWin2('context.html', 375)
    }

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
    createWin2('context.html', 189)

    win2.on('close', function() {
      createList(actualPath)
      win2 = null
    });

    win2.webContents.send('setLocation', path);
    //Name
    let name = path.substring(path.lastIndexOf("\\")+1)
    win2.webContents.send('setName', name);
    win2.webContents.send('setPath', undefined);
    win2.webContents.send('setIconPath', undefined);
  })

  ipcMain.on('getFileContext', async function(event, path) {
    let apath = path.substring(0, path.lastIndexOf('\\')+1)
    if (!fs.existsSync(apath)) win2.webContents.send('fileGotten', await getFile("Choose a Game"))
    else win2.webContents.send('fileGotten', await getFile("Choose a Game", `${apath}`))
  })

  ipcMain.on('getFileIconContext', async function(event, path) {
    let apath = path.substring(0, path.lastIndexOf('\\')+1)
    if (!fs.existsSync(apath)) win2.webContents.send('fileGottenIcon', await getFile("Choose a Game"))
    else win2.webContents.send('fileGottenIcon', await getFile("Choose a Game", `${apath}`))
  })

  ipcMain.on('move', async function(event, path) {
    if (fs.existsSync(path)) {
      let newFilePath = await getFolder("Choose a Folder", launcherFolder)+'\\'
      if (!newFilePath.includes(launcherFolder)) return
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
    const { dialog } = require('electron')
    let name = path.substring(path.lastIndexOf("\\")+1)
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
    const { dialog } = require('electron')
    let name = path.substring(path.lastIndexOf("\\")+1)
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
    if (newName == '') {
      win2.webContents.send('log', 'Name Is Necesary');
      return
    }
    if (fs.existsSync(path)) {
      if (fs.statSync(path).isFile()) {
        if (newPath == '') {
          win2.webContents.send('log', 'Path Is Necesary');
          return
        }
        fs.writeFile(path, newPath+'\n'+newIcon, (err) => {
          if (newName != undefined) {
            let newFilePath = actualPath+newName+'.txt'
            fs.rename(path, newFilePath, function(err) {
              closeWin2()
              createList(actualPath)
            })
          } else {
            closeWin2()
            createList(actualPath)
          }
        })
      } else {
        if (newName != undefined) {
          let newFilePath = actualPath+newName
          fs.rename(path, newFilePath, function(err) {
            closeWin2()
            createList(actualPath)
          })
        } else {
          closeWin2()
          createList(actualPath)
        }
      }
    }
  })

  ipcMain.on('addfolder', (event) => {
    createWin2('addfolder.html', 189)

    win2.on('close', function() {
      createList(actualPath)
      win2 = null
    });

    win2.webContents.send('setLocation', actualPath);
  })

  ipcMain.on('addgame', (event) => {
    createWin2('addgame.html', 375)

    win2.on('close', function() {
      createList(actualPath)
      win2 = null
    });

    win2.webContents.send('setLocation', actualPath);
  })

  
  //FUNCTIONS LAUNCHER CREATOR
  ipcMain.on('getFile', async function(event, path) {
    let apath = path.substring(0, path.lastIndexOf('\\')+1)
    if (!fs.existsSync(apath)) win.webContents.send('fileGotten', await getFile("Choose a Game"))
    else win.webContents.send('fileGotten', await getFile("Choose a Game", `${apath}`))
  })

  ipcMain.on('getFileIcon', async function(event, path) {
    let apath = path.substring(0, path.lastIndexOf('\\')+1)
    if (!fs.existsSync(apath)) win.webContents.send('fileGottenIcon', await getFile("Choose a Game"))
    else win.webContents.send('fileGottenIcon', await getFile("Choose a Game", `${apath}`))
  })

  ipcMain.on('addFolder', (event, name) => {
    let fullName = actualPath+name.trim()
    if (!fs.existsSync(fullName)) {
      fs.mkdirSync(fullName);
      closeWin2()
      win.webContents.send('log', `Folder "${name}" Added`);
    } else win.webContents.send('log', `Folder "${name}" Already Exists`);
  })

  ipcMain.on('addGame', (event, name, path, icon) => {
    let fullName = actualPath+name.trim()+'.txt'
    let data = path
    if (icon != '') data = path+'\n'+icon
    if (!fs.existsSync(fullName)) {
      fs.writeFile(fullName, data, (err) => {
        win.webContents.send('log', `Game "${name}" Added`);
        closeWin2()
      })
    } else win.webContents.send('log', `Game "${name}" Already Exists`);
  })


  //FUNCTIONS STORE
  ipcMain.on('searchGames', (event, orSearch) => {
    searchGames(orSearch)
  })

  function searchGames(orSearch) {
    win.webContents.send('clearList');
    win.webContents.send('searchingResults', 'Elamigos');
    win.webContents.send('searchingResults', 'Fitgirl');
    win.webContents.send('searchingResults', 'Pivi');
    win.webContents.send('searchingResults', 'SteamUnlocked');

    let search = orSearch.replaceAll(' ', '+')

    let fullURL = 'https://www.elamigos-games.com/?q='+search
    if (search == '') fullURL = 'https://www.elamigos-games.com/'
    getHTMLAgent(fullURL).then(function(result) {
      if (result == undefined) win.webContents.send('noResults', 'Elamigos');
      else elamigos(result)
    })

    fullURL = 'https://fitgirlrepacks.co/search/'+search
    if (search == '' || search.length < 3) fullURL = 'https://fitgirlrepacks.co/'
    getHTMLAgent(fullURL).then(function(result) {
      if (result == undefined) win.webContents.send('noResults', 'Fitgirl');
      else fitgirl(result)
    })

    fullURL = 'https://pivigames.blog/?s='+search
    if (search == '') fullURL = 'https://pivigames.blog/'
    getHTMLAgent(fullURL).then(function(result) {
      if (result == undefined) win.webContents.send('noResults', 'Fitgirl');
      else pivi(result)
    })

    fullURL = 'https://steamunlocked.net/?s='+search
    if (search == '') fullURL = 'https://steamunlocked.net/'
    getHTMLAgent(fullURL).then(function(result) {
      if (result == undefined) win.webContents.send('noResults', 'Fitgirl');
      else steamunlocked(result, search)
    })
  }

  function elamigos(result) {
    if (window != 'store') return
    win.webContents.send('clearList', 'listElamigos');
    let part = result.substring(result.indexOf('<div class="col-lg-2 '), result.indexOf('<!-- /.row -->'))
    var si = part.split('<div class="col-lg-2 ')
    var links = []
    var names = []
    var imgs = []
    var infos = []
    //LINKS & NAMES & IMAGES
    for(i in si) {
      if (links.length == 12) break
      let tmp = si[i].substring(si[i].lastIndexOf('href="')+6)
      tmp = tmp.substring(0, tmp.indexOf('<'))
      let link = tmp.substring(0, tmp.indexOf('"'))
      let name = tmp.substring(tmp.indexOf('>')+1)
      let img = si[i].substring(si[i].indexOf('src="')+5)
      img = 'https://www.elamigos-games.com'+img.substring(0, img.indexOf('"'))
      let info = si[i].substring(si[i].lastIndexOf('<small>')+7)
      info = info.substring(0, info.indexOf('</small>'))
      info = info.replaceAll('+', '').trim()
      if (link != '' && img != '' && link.startsWith('https://www.elamigos-games.com')) {
        links.push(link)
        names.push(titleCase(name))
        imgs.push(img)
        infos.push(info)
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
      let info = infos[i]
      if (info != '') html = createStoreHTML2(id, null, img, name, info)
      else html = createStoreHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listElamigos');
      win.webContents.send('addListener', id, link);
    }
  }

  function fitgirl(result) {
    if (!result.includes('<article class="post')) {
      win.webContents.send('noResults', 'Fitgirl');
      return
    }
    
    if (window != 'store') return
    win.webContents.send('clearList', 'listFitgirl');
    let part = result.substring(result.indexOf('<article class="post'), result.indexOf('<nav class="navigation paging-navigation"'))
    var si = part.split('<article class="post')
    var links = []
    var names = []
    //LINKS & NAMES
    for(i in si) {
      let link = si[i].substring(si[i].indexOf('href="https://fitgirlrepacks.co/repack')+6)
      link = link.substring(0, link.indexOf('"'))
      let name = si[i].substring(si[i].indexOf('rel="bookmark">')+15)
      name = name.substring(0, name.indexOf('<'))
      if (link != '' && name != '' && name != 'Upcoming repacks') {
        links.push(link)
        names.push(titleCase(name))
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'Fitgirl');
    else win.webContents.send('hasResults', 'Fitgirl');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `fitgirl${i}`
      let tmp = links[i]
      tmp = tmp.substring(tmp.lastIndexOf('/'))
      tmp = tmp.substring(tmp.indexOf('-')+1)
      let link = 'https://fitgirl-repacks.site/'+tmp
      let name = names[i]
      let name2 = ''
      let info = ''
      if (name.includes('&#8211;')) {
        name2 = name.substring(0, name.indexOf('&#8211;')).trim()
        info = name.substring(name.indexOf('&#8211;')+7).trim()
      }
      let img = i+link
      let html
      if (name2 != '' && info != '') html = createStoreHTML2(id, img, './Data/Images/icon_file.png', name2, info)
      else html = createStoreHTML(id, img, './Data/Images/icon_file.png', name)
      win.webContents.send('add1ToList', html, 'listFitgirl');
      win.webContents.send('addListener', id, link);
      //IMAGE
      fitgirlImg(links[i]).then((image) =>{ 
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
    if (window != 'store') return
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
      if (!tmp.includes('>estrenos<') && !tmp.includes('>tops<') && !tmp.includes('>promociones<') && !tmp.includes('>oferta<') && !tmp.includes('>free to play<') && !tmp.includes('>destacadas<')) {
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
      let name2 = ''
      let info = ''
      if (name.toLowerCase().includes('pc ')) {
        name2 = name.substring(0, name.toLowerCase().indexOf('pc ')).trim()
        info = name.substring(name.toLowerCase().indexOf('pc ')+2).replaceAll('+', '').trim()
      }
      if (name2 != '' && info != '') html = createStoreHTML2(id, null, img, name2, info)
      else html = createStoreHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listPivi');
      win.webContents.send('addListener', id, link);
    }
  }

  function steamunlocked(result, search) {
    if (window != 'store') return
    win.webContents.send('clearList', 'listSteamUnlocked');
    var si
    if (search != '') {
      let part = result.substring(result.indexOf('class="cover-items"')) //remove top
      part = part.substring(0, part.indexOf('class="col-lg-4"')) //to bot
      si = part.split('class="cover-item category"')
    } else {
      let part = result.substring(result.indexOf('class="vc_pageable-slide-wrapper vc_clearfix"')) //remove top
      part = part.substring(0, part.indexOf('class="vc_pageable-load-more-btn"')) //to bot
      si = part.split('class="vc_grid-item vc_clearfix')
    }
    var links = []
    var names = []
    var imgs = []
    //LINKS & NAMES & IMAGES
    for(i in si) {
      if (links.length == 12) break
      let link = si[i].substring(si[i].indexOf('href="')+6)
      link = link.substring(0, link.indexOf('"')-1)
      let name
      if (search != '') {
        name = si[i].substring(si[i].indexOf('<h1>')+4)
        name = name.substring(0, name.indexOf('</h1>'))
      } else {
        name = si[i].substring(si[i].indexOf('title="')+7)
        name = name.substring(0, name.indexOf('"'))
      }
      let img = si[i].substring(si[i].lastIndexOf('src="')+5)
      img = img.substring(0, img.indexOf('"'))
      if (link != '' && name != '' && img != '') {
        links.push(link)
        names.push(titleCase(name))
        imgs.push(img)
      }
    }
    //HAS RESULTS
    if (links.length == 0) win.webContents.send('noResults', 'SteamUnlocked');
    else win.webContents.send('hasResults', 'SteamUnlocked');
    //ADD GAMES
    for(i in links) {
      if (window != 'store') return
      let id = `steamunlocked${i}`
      let img = imgs[i]
      let link = links[i]
      let name = names[i]
      let name2 = ''
      let info = ''
      if (name.toLowerCase().includes('free download')) {
        name2 = name.substring(0, name.toLowerCase().indexOf('free download')).trim()
        info = name.substring(name.toLowerCase().indexOf('free download')+13).trim()
      }
      if (name2 != '' && info != '') html = createStoreHTML2(id, null, img, name2, info)
      else if (name2 != '') html = createStoreHTML(id, null, img, name2)
      else html = createStoreHTML(id, null, img, name)
      win.webContents.send('add1ToList', html, 'listSteamUnlocked');
      win.webContents.send('addListener', id, link);
    }
  }

  async function getHTMLAgent(url) {
    const superagent = require('superagent');
    const response = await superagent.get(url).set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36').catch(function(err){})
    return response.text
  }

  function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
  }


  //THEME MANAGER
  function createThemeList() {
    let argPath = app.getAppPath()+'\\Data\\Themes\\'
    if (!fs.existsSync(argPath)) return
    win.webContents.send('clearList');
    //START
    let allPaths = fs.readdirSync(argPath);
    for(i in allPaths) {
      //Data
      let path = argPath+allPaths[i]
      let data = getFileInfo(path)
      let name = data.name
      let image = "./Data/Images/icon_file.png"
      if (fs.existsSync(path+'\\Data\\Images\\icon_file.png')) image = path+'\\Data\\Images\\icon_file.png'
      //Id
      let id = path+i
      //HTML
      let html = createHTML(id, null, image, name)
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addListener', id, path);
    }
  }
  
  ipcMain.on('copyTheme', (event, path) => {
    const fse = require('fs-extra');
    fse.copy(path, app.getAppPath(), { overwrite: true }).then(function() {
      window = ''
      win.reload()
    }).catch(err => console.error(err))
  })

  ipcMain.on('openThemeFolder', (event) => {
    const { shell } = require('electron');
    let themeFolder = dataFolder+'Themes\\'
    if (fs.existsSync(themeFolder)) {
      shell.openPath(themeFolder)
    }
  })
})

//FUNCTIONS ALL
function createWindow() {
  win = new BrowserWindow({
    height: 550,
    width: 970,
    minHeight: 490,
    minWidth: 815,
    frame: false,
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
  let appIcon = new Tray(dataFolder+"Images/icon.ico");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Store', click: function () {
        if (window != 'store') {
          win.webContents.send('load', 'store.html')
          window = 'store'
        }
        if (win.isMinimized() || !win.isVisible())
        win.show();
      }
    },
    {
      label: 'Library', click: function () {
        if (window != 'launcher') {
          win.webContents.send('load', 'launcher.html')
          window = 'launcher'
        }
        if (win.isMinimized() || !win.isVisible())
        win.show();
      }
    },
    {
      label: 'Themes', click: function () {
        if (window != 'themes') {
          win.webContents.send('load', 'themes.html')
          window = 'themes'
        }
        if (win.isMinimized() || !win.isVisible())
        win.show();
      }
    },
    {
      label: 'Quit Oriøn', click: function () {
        closing = true;
        app.quit();
      }
    }
  ]);

  appIcon.on('double-click', function (event) {
      win.show();
  });
  appIcon.setToolTip('Oriøn Launcher');
  appIcon.setContextMenu(contextMenu);
  return appIcon;
}

function updateTheme() {
  let si = fs.readFileSync(dataFolder+'settings.txt').toString().trim().split('\n')
  let background = si[0]
  if (background != undefined) background = background.replaceAll('\r', '')
  let c1 = si[1]
  if (c1 != undefined) c1 = c1.replaceAll('\r', '')
  let c2 = si[2]
  if (c2 != undefined) c2 = c2.replaceAll('\r', '')
  let c3 = si[3]
  if (c3 != undefined) c3 = c3.replaceAll('\r', '')
  let c4 = si[4]
  if (c4 != undefined) c4 = c4.replaceAll('\r', '')
  theme = { background, c1, c2, c3, c4}
}

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
      if (gamePath.startsWith('?:')) gamePath = gamePath.replace('?:', launcherFolder.substring(0, 2))
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

function getPathInfo(gamePath) {
  //update add and context aswell
  gamePath = gamePath.trim()
  let pathClean = gamePath
  let argsClean = ''
  if (gamePath.includes('--') && gamePath.includes(' ') && !gamePath.endsWith('"')) {
    if (gamePath.startsWith('"') ) {
      pathClean = gamePath.substring(1, gamePath.lastIndexOf('"'))
      let args = gamePath.substring(pathClean.length+2).trim()
      argsClean = args.split(' ')
      argsClean.unshift("/c", pathClean)
    } else {
      pathClean = gamePath.substring(0, gamePath.lastIndexOf(' '))
      let args = gamePath.substring(pathClean.length+2).trim()
      argsClean = args.split(' ')
      argsClean.unshift("/c", pathClean)
    }
  }
  let data = {pathClean, argsClean}
  return data
}

function createWin2(file, size) {
  win2 = new BrowserWindow({
    height: size,
    width: 390,
    minHeight: size,
    minWidth: 390,
    maxHeight: size,
    maxWidth: 390,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  win2.loadFile(file)
  win2.removeMenu()
  //win2.openDevTools()

  win2.webContents.on('dom-ready', () => {
    win2.webContents.send('theme', theme);
  })
}

function closeWin2() {
  if (win2 != null)
  win2.close()
}

function createHTML(id, img, icon, name) {
  let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 150px; height: 150px; background-image: url('./Data/Images/icon_item.png'); text-align: center; display: inline-block;">
                <div style="width: 150px; height: 100px;">
                  <img id="${img}" style="margin: 10px; max-width: 130px; height: 90px; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: 140px; height: 40px; padding: 5px">
                  <div class="unselectableDiv">
                    <div style="font-size: 17px; overflow: hidden; width: 140px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${name}</div>
                  </div>
                </div>
              </div>`
  return html
}

function createStoreHTML(id, img, icon, name) {
  let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 200px; height: 250px; background-image: url('./Data/Images/icon_store_item.png'); text-align: center; display: inline-block;">
                <div style="width: 200px; height: 200px;">
                  <img id="${img}" style="margin: 10px; max-width: 180px; height: 180px; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: 190px; height: 40px; padding: 5px">
                  <div class="unselectableDiv">
                    <div style="font-size: 17px; overflow: hidden; width: 190px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${name}</div>
                  </div>
                </div>
              </div>`
  return html
}

function createStoreHTML2(id, img, icon, name, info) {
  let html = `<div id="${id}" style="margin-top: 5px; margin-right: 5px; width: 200px; height: 250px; background-image: url('./Data/Images/icon_store_item.png'); text-align: center; display: inline-block;">
                <div style="width: 200px; height: 200px;">
                  <img id="${img}" style="margin: 10px; max-width: 180px; height: 180px; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: 190px; height: 40px; padding: 5px">
                  <div class="unselectableDiv">
                    <div style="font-size: 17px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; width: 190px;">${name}</div>
                    <div style="font-size: 14px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; width: 190px; padding-top: 2px;">${info}</div>
                  </div>
                </div>
              </div>`
  return html
}

async function getFile(title, path) {
  const { dialog } = require('electron')
  if (path == undefined) {
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
  } else {
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
}

async function getFolder(title, path) {
  const { dialog } = require('electron')
  if (path == undefined) {
    let result = await dialog.showOpenDialog({
      title: title,
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
  } else {
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
}