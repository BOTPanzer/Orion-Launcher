const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron')
const fs = require('fs');
let closing = false
let paused = false

let tray = null

let window = ''
let refreshTheme = true

let win = null
let win2 = null
let win3 = null

let dataFolder = null
let dataFile = null
var theme = 'Data\\settings.html'
let launcherFolder = null
let actualPath = null

let defImage = null

let tempsearch = undefined


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
    if (win) {
      if (win.isMinimized() || !win.isVisible())
      win.show();
    }
  })

  // /$$      /$$  /$$$$$$  /$$$$$$ /$$   /$$
  //| $$$    /$$$ /$$__  $$|_  $$_/| $$$ | $$
  //| $$$$  /$$$$| $$  \ $$  | $$  | $$$$| $$
  //| $$ $$/$$ $$| $$$$$$$$  | $$  | $$ $$ $$
  //| $$  $$$| $$| $$__  $$  | $$  | $$  $$$$
  //| $$\  $ | $$| $$  | $$  | $$  | $$\  $$$
  //| $$ \/  | $$| $$  | $$ /$$$$$$| $$ \  $$
  //|__/     |__/|__/  |__/|______/|__/  \__/

  dataFolder = app.getAppPath()+'\\Data\\'
  dataFile = dataFolder+'data'
  createWindow()
  createTray()

  //WINDOWS
  win.on('close', function() {
    closeWin2()
    closeWin3()
  })

  win.webContents.on('dom-ready', function() {
    if (window == '') {
      win.webContents.send('load', 'launcher.html')
      window = 'launcher'
    }
  })

  ipcMain.on('launcher', (event) => {
    if (window == 'launcher') return
    win.webContents.send('load', 'launcher.html')
    window = 'launcher'
  })

  ipcMain.on('store', (event, search) => {
    if (window == 'store') return
    tempsearch = search
    win.webContents.send('load', 'store.html')
    window = 'store'
  })

  ipcMain.on('themes', (event) => {
    if (window == 'themes') return
    win.webContents.send('load', 'themes.html')
    window = 'themes'
  })

  ipcMain.on('other', (event) => {
    if (window == 'other') return
    win.webContents.send('load', 'other.html')
    window = 'other'
  })

  ipcMain.on('loaded', (event) => {
    var size = win.getSize()
    win.webContents.send('resized', size[0])
    if (refreshTheme) {
      refreshTheme = false
      win.webContents.send('theme', theme)
    }
    if (window == 'launcher') {
      createList(actualPath)
    } else if (window == 'store') {
      if (tempsearch != undefined) searchGames(tempsearch)
      else searchGames('')
    } else if (window == 'themes') {
      createThemeList()
    } else if (window == 'other') {
      fs.readFile(dataFile, 'utf8' , (err, data) => {
        win.webContents.send('gfolder', data)
      })
    }
  })

  //FUNCTIONS
  win.on('resize', function () {    
    var size = win.getSize()
    win.webContents.send('resized', size[0])
  })

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

  // /$$        /$$$$$$  /$$   /$$ /$$   /$$  /$$$$$$  /$$   /$$ /$$$$$$$$ /$$$$$$$ 
  //| $$       /$$__  $$| $$  | $$| $$$ | $$ /$$__  $$| $$  | $$| $$_____/| $$__  $$
  //| $$      | $$  \ $$| $$  | $$| $$$$| $$| $$  \__/| $$  | $$| $$      | $$  \ $$
  //| $$      | $$$$$$$$| $$  | $$| $$ $$ $$| $$      | $$$$$$$$| $$$$$   | $$$$$$$/
  //| $$      | $$__  $$| $$  | $$| $$  $$$$| $$      | $$__  $$| $$__/   | $$__  $$
  //| $$      | $$  | $$| $$  | $$| $$\  $$$| $$    $$| $$  | $$| $$      | $$  \ $$
  //| $$$$$$$$| $$  | $$|  $$$$$$/| $$ \  $$|  $$$$$$/| $$  | $$| $$$$$$$$| $$  | $$
  //|________/|__/  |__/ \______/ |__/  \__/ \______/ |__/  |__/|________/|__/  |__/

  app.getFileIcon('', {size:"large"}).then((fileIcon) =>{ defImage = fileIcon.toDataURL() })
  launcherFolder = app.getAppPath()+'\\Launcher\\'
  actualPath = launcherFolder
  
  //ARGS
  let startArg = app.commandLine.getSwitchValue("start")
  startArg = startArg.replaceAll('|', ' ')
  if (startArg != '') {
    actualPath = launcherFolder+startArg
    if (!fs.existsSync(actualPath)) actualPath = launcherFolder
  }
  
  //FUNCTIONS
  ipcMain.on('loadPath', (event, path, search) => {
    createList(path, search)
  })

  function createList(argPath, search) {
    if (search == undefined) search = ''
    if (!argPath.endsWith('\\')) argPath = argPath+'\\'
    if (!fs.existsSync(argPath)) return
    win.webContents.send('startLauncher', search)
    win.webContents.send('setLocPath', argPath, launcherFolder, search)
    createBackButt(argPath, search)

    let paths = []
    if (search == '') {
      paths = fs.readdirSync(argPath)
      rest()
    } else {
      var recursive = require("recursive-readdir");
      recursive(argPath, function (err, files) {
        for(i in files) {
          let tmp = files[i].substring(argPath.length)
          let tmp2 = files[i].substring(files[i].lastIndexOf('\\')+1)
          if (tmp2.endsWith('.txt')) tmp2 = tmp2.slice(0,-4)
          if (tmp2.toLowerCase().includes(search.toLowerCase()))
            paths.push(tmp)
        }
        rest()
      })
    }

    function rest() {
      //FIRST FOLDERS THEN FILES
      let folders = []
      let files = []
      for(i in paths) {
        let path = argPath+paths[i]
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
      actualPath = argPath
      for(i in allPaths) {
        //Data
        let path = argPath+allPaths[i]
        let data = getFileInfo(path)
        let isFile = data.isFile
        let name = data.name
        let gamePath = data.gamePath
        let iconPath = data.iconPath
        if (iconPath == undefined) iconPath = ''
        let pathClean = ''
        let argsClean = ''
        if (isFile) {
          let gamePathArg = getPathInfo(gamePath)
          pathClean = gamePathArg.pathClean
          argsClean = gamePathArg.argsClean
        }
        //Id
        let id = `game${i}`
        if (!isFile) id = `folder${i}`
        let img = `img${i}`
        //Default Image
        let icon = "./Data/Images/icon_folder.png"
        if (isFile) icon = "./Data/Images/icon_file.png"
        //Create HTML
        let html = createDataHTML(id, img, icon, path, isFile, name, gamePath, iconPath, pathClean, argsClean)
        win.webContents.send('add1ToList', html)
        win.webContents.send('addListener', id, img)
        if (isFile) {
          if (iconPath == '') iconPath = pathClean
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            if (iconPath.toLowerCase().endsWith('.exe')) {
              app.getFileIcon(iconPath, {size:"large"}).then((fileIcon) =>{
                if (defImage != fileIcon.toDataURL() && actualPath == argPath) {
                  win.webContents.send('changeIcon', img, fileIcon.toDataURL())
                }
              })
            } else {
              win.webContents.send('changeIcon', img, iconPath)
            }
          }
        }
      }
      win.webContents.send('finished')
    }
  }

  function createBackButt(argPath, search) {
    let bpath = argPath
    if (search == '' && argPath != launcherFolder) {
      //bpath
      if (bpath.endsWith("\\")) bpath = bpath.slice(0,-1)
      let numb = bpath.split("\\").length - 1
      if (numb > 1) bpath = bpath.substring(0, bpath.lastIndexOf("\\")+1)
      win.webContents.send('addFolderListener', 'backButt', bpath);
      //HTML
      let html = createDataHTML('backButt', 'backImg', './Data/Images/icon_back.png', bpath, 'false', 'Back', '', '', '', '')
      win.webContents.send('add1ToList', html)
      win.webContents.send('addListener', 'backButt', 'backImg')
    } else if (search != '') {
      //HTML
      let html = createDataHTML('backButt', 'backImg', './Data/Images/icon_back.png', bpath, 'false', 'Back', '', '', '', '')
      win.webContents.send('add1ToList', html)
      win.webContents.send('addListener', 'backButt', 'backImg')
    }
  }

  ipcMain.on('openFile', (event, pathClean, argsClean) => {
    if (argsClean != '') {
      let spawn = require("child_process").spawn;
      let bat = spawn("cmd.exe", argsClean)
    } else {
      const { shell } = require('electron');
      shell.openPath(pathClean)
    }
  })

  ipcMain.on('showOnExplorer', (event, path) => {
    const { shell } = require('electron');
    shell.showItemInFolder(path)
  })

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
    createList(actualPath)
  })

  ipcMain.on('exitContext3', (event) => {
    closeWin3();
    if (win2 != null)
    win2.show()
  })
  
  //FUNCTIONS
  ipcMain.on('askForIconWin2', async function(event, argPath, path) {
    askForIconWin2(argPath, path)
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
            createList(actualPath)
          }
        })
      } else if (i == paths.length-1) {
        closeWin2()
        createList(actualPath)
      }
    }
  })

  ipcMain.on('remove', (event, paths) => {
    createWin3('remove.html')
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
              createList(actualPath)
            }
          })
        } else {
          const rimraf = require("rimraf");
          rimraf(path, (err) => {
            if (i == paths.length-1) {
              closeWin2()
              closeWin3()
              createList(actualPath)
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
          if (fs.existsSync(newFilePath)) {
            win2.webContents.send('log', 'Folder Already Exists');
            return
          }
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

  //  /$$$$$$  /$$$$$$$$ /$$$$$$  /$$$$$$$  /$$$$$$$$
  // /$$__  $$|__  $$__//$$__  $$| $$__  $$| $$_____/
  //| $$  \__/   | $$  | $$  \ $$| $$  \ $$| $$      
  //|  $$$$$$    | $$  | $$  | $$| $$$$$$$/| $$$$$   
  // \____  $$   | $$  | $$  | $$| $$__  $$| $$__/   
  // /$$  \ $$   | $$  | $$  | $$| $$  \ $$| $$      
  //|  $$$$$$/   | $$  |  $$$$$$/| $$  | $$| $$$$$$$$
  // \______/    |__/   \______/ |__/  |__/|________/

  ipcMain.on('searchGames', (event, orSearch) => {
    searchGames(orSearch)
  })

  ipcMain.on('storeLeftClick', (event, link) => {
    let winStore = new BrowserWindow({
      height: 550,
      width: 970
    })
    
    winStore.loadURL(link)
    winStore.removeMenu()
  })

  function searchGames(orSearch) {
    win.webContents.send('clearList');
    win.webContents.send('changeText', orSearch);
    win.webContents.send('searchingResults', 'Elamigos');
    win.webContents.send('searchingResults', 'Fitgirl');
    win.webContents.send('searchingResults', 'Pivi');
    win.webContents.send('searchingResults', 'SteamUnlocked');

    let search = orSearch.toLowerCase().replaceAll(' ', '+')

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
    if (response != undefined) return response.text
    else console.log('no va '+url)
  }

  function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
  }

  // /$$$$$$$$ /$$   /$$ /$$$$$$$$ /$$      /$$ /$$$$$$$$
  //|__  $$__/| $$  | $$| $$_____/| $$$    /$$$| $$_____/
  //   | $$   | $$  | $$| $$      | $$$$  /$$$$| $$      
  //   | $$   | $$$$$$$$| $$$$$   | $$ $$/$$ $$| $$$$$   
  //   | $$   | $$__  $$| $$__/   | $$  $$$| $$| $$__/   
  //   | $$   | $$  | $$| $$      | $$\  $ | $$| $$      
  //   | $$   | $$  | $$| $$$$$$$$| $$ \/  | $$| $$$$$$$$
  //   |__/   |__/  |__/|________/|__/     |__/|________/

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
      let id = 'theme'+i
      //HTML
      let html = createDataHTML(id, null, image, undefined, undefined, name)
      //Create
      win.webContents.send('add1ToList', html);
      win.webContents.send('addListener', id, path);
    }
  }
  
  ipcMain.on('copyTheme', (event, path) => {
    const fse = require('fs-extra');
    fse.copy(path, app.getAppPath(), { overwrite: true }).then(function() {
      window = ''
      refreshTheme = true
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

  //  /$$$$$$  /$$$$$$$$ /$$   /$$ /$$$$$$$$ /$$$$$$$ 
  // /$$__  $$|__  $$__/| $$  | $$| $$_____/| $$__  $$
  //| $$  \ $$   | $$   | $$  | $$| $$      | $$  \ $$
  //| $$  | $$   | $$   | $$$$$$$$| $$$$$   | $$$$$$$/
  //| $$  | $$   | $$   | $$__  $$| $$__/   | $$__  $$
  //| $$  | $$   | $$   | $$  | $$| $$      | $$  \ $$
  //|  $$$$$$/   | $$   | $$  | $$| $$$$$$$$| $$  | $$
  // \______/    |__/   |__/  |__/|________/|__/  |__/
    
  ipcMain.on('getFile', async function(event, path, title, sendReturn) {
    if (title == undefined || title == '') title = 'Choose a File'
    if (fs.existsSync(path)) win.webContents.send(sendReturn, await getFile(title, path))
    else win.webContents.send(sendReturn, await getFile(title))
  })

  ipcMain.on('getFile2', async function(event, path, title, sendReturn) {
    if (title == undefined || title == '') title = 'Choose a File'
    if (fs.existsSync(path)) win2.webContents.send(sendReturn, await getFile(title, path))
    else win2.webContents.send(sendReturn, await getFile(title))
  })
  
  //INSTALLER
  ipcMain.on('install', async function(event, path, name, destination) {
    //PATH
    if (!fs.existsSync(path)) {
      win.webContents.send('log', 'File path does not exist')
      resume()
      return
    }
    //DESTINATION
    if (!destination.endsWith('\\')) destination = destination+'\\'
    if (!fs.existsSync(destination)) {
      win.webContents.send('log', 'Destination does not exist')
      resume()
      return
    }
    //CHECK TO CREATE FOLDER
    var exec = require('child_process').exec
    let zip = dataFolder+'7zip\\7za.exe'
    exec(`"${zip}" l "${path}" -x!*\\*`, function (error, stdOut, stdErr) {
      if (error || stdErr) {
        win.webContents.send('log', 'An error ocurred while reading the file')
        resume()
      } else {
        stdOut = stdOut.replaceAll('\r', '').replaceAll('\n', '')
        if (stdOut.endsWith('0 files, 1 folders')) {
          exec(`"${zip}" l -slt "${path}" -x!*\\*`, function (error, stdOut, stdErr) {
            if (error || stdErr) {
              win.webContents.send('log', 'An error ocurred while reading the file')
              resume()
            } else {
              let outSplit = stdOut.replaceAll('\r', '').split("\n")
              let paths = []
              for(i in outSplit) {
                if (outSplit[i].includes('Path = ')) {
                  paths.push(outSplit[i].substring(7))
                }
              }
              let insideFolderName = paths[paths.length-1]
              //FOLDER EXISTS
              let destination2 = destination+insideFolderName+'\\'
              if (fs.existsSync(destination2)) {
                win.webContents.send('log', name+' is already installed')
                resume()
                return
              }
              //NAME
              let tmpName = path.substring(path.lastIndexOf('\\')+1)
              if (tmpName.includes('.')) tmpName = tmpName.substring(0, tmpName.lastIndexOf('.'))
              //INSTALL
              install(zip, path, tmpName, destination, destination, insideFolderName, name)
            }
          })
        } else {
          //NAME
          if (name == '') {
            name = path.substring(path.lastIndexOf('\\')+1)
            if (name.includes('.')) name = name.substring(0, name.lastIndexOf('.'))
          }
          //NEW FOLDER EXISTS
          let destination2 = destination+name+'\\'
          if (fs.existsSync(destination2)) {
            win.webContents.send('log', name+' is already installed')
            resume()
            return
          }
          //INSTALL
          install(zip, path, name, destination, destination2)
        }
      }
    })
  })

  function install(zip, path, name, destination, destination2, insideFolderName, nName) {
    updateData('gfolder', destination)
    win.webContents.send('log', 'Installing '+name+'...')
    var exec = require('child_process').exec
    exec(`"${zip}" x "${path}" -o"${destination2}"`, function (error, stdOut, stdErr) {
      if (error || stdErr) {
        win.webContents.send('log', 'An error ocurred while unzipping')
        resume()
      } else {
        if (insideFolderName != undefined) {
          if (nName == '') {
            win.webContents.send('log', 'Installation successful')
            resume()
            const { shell } = require('electron')
            shell.openPath(destination+insideFolderName)
          } else {
            //RENAME insideFolderName TO nName
            let newPath = destination+nName
            if (newPath != destination+insideFolderName) {
              if (fs.existsSync(newPath)) {
                win.webContents.send('log', nName+' is already installed')
                resume()
                return
              }
              fs.rename(destination+insideFolderName, newPath, function(err) {
                if (err) {
                  win.webContents.send('log', 'An error ocurred while renaming a folder')
                  resume()
                } else {
                  win.webContents.send('log', 'Installation successful')
                  resume()
                  const { shell } = require('electron')
                  shell.openPath(newPath)
                }
              })
            } else {
              win.webContents.send('log', 'Installation successful')
              resume()
              const { shell } = require('electron')
              shell.openPath(newPath)
            }
          }
        } else {
          win.webContents.send('log', 'Installation successful')
          resume()
          const { shell } = require('electron')
          shell.openPath(destination2)
        }
      }
    })
  }
})

//FUNCTIONS ALL
function createWindow() {
  win = new BrowserWindow({
    height: 540,
    width: 955,
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
  let appIcon = new Tray(dataFolder+"Images/icon.ico");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Store', click: function () {
        if (paused) return
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
        if (paused) return
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
        if (paused) return
        if (window != 'themes') {
          win.webContents.send('load', 'themes.html')
          window = 'themes'
        }
        if (win.isMinimized() || !win.isVisible())
        win.show();
      }
    },
    {
      label: 'Installer', click: function () {
        if (paused) return
        if (window != 'other') {
          win.webContents.send('load', 'other.html')
          window = 'other'
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
  ])

  appIcon.on('double-click', function (event) {
    win.show();
  })
  appIcon.setToolTip('Oriøn Launcher')
  appIcon.setContextMenu(contextMenu)
  tray = appIcon
}

function updateData(line, data) {
  /*also update on loaded to get only the first line
  fs.readFile(dataFile, 'utf8' , (err, data) => {
    let data = gfolder+'\n'
  })*/
  fs.writeFile(dataFile, data, (err) => { if (err) console.log(err) })
}

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
      if (gamePath.startsWith('?:') && fixed) gamePath = gamePath.replace('?:', launcherFolder.substring(0, 2))
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

function createWin2(file, size, arg1, arg2) {
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
  
  win2.hide()
  win2.loadFile('win2.html')
  win2.removeMenu()
  win2.openDevTools()

  win2.webContents.on('dom-ready', () => {
    win2.webContents.send('load', file, arg1, arg2)
    win2.show()
  })
}

function askForIconWin2(argPath, path) {
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

ipcMain.on('loadedWin2', (event, window, arg1, arg2) => {
  win2.webContents.send('theme', theme)
  if (window == 'addfolder.html' || window == 'addgame.html') {
    win2.webContents.send('setLocation', actualPath);
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
      askForIconWin2(arg1, gamePath)
    else
      askForIconWin2(arg1, iconPath)

    win2.webContents.send('setLocation', arg1, arg2)
    win2.webContents.send('setName', name)
    win2.webContents.send('setPath', gamePath)
    win2.webContents.send('setIconPath', iconPath)
  } else if (window == 'context-multi.html') {
    win2.webContents.send('setPaths', arg1)
  }
})

function closeWin2() {
  if (win2 != null)
  win2.close()
}

function createWin3(file) {
  win3 = new BrowserWindow({
    height: 136,
    width: 390,
    minHeight: 136,
    minWidth: 390,
    maxHeight: 136,
    maxWidth: 390,
    frame: false,
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
    win3.webContents.send('theme', theme);
    win3.show()
  })
}

function closeWin3() {
  if (win3 != null)
  win3.close()
}


function createDataHTML(id, img, icon, path, isFile, name, gamePath, iconPath, pathClean, argsClean) {
  let html = `<div id="${id}" style="width: var(--size1); height: var(--size1); margin-top: 5px; margin-left: 5px; background-image: url('./Data/Images/icon_item.png'); background-repeat: no-repeat; background-size: cover; text-align: center; display: inline-block;">
                
                <div id="${'path-'+id}" style="display: none;">${path}</div>
                <div id="${'isFile-'+id}" style="display: none;">${isFile}</div>
                <div id="${'name-'+id}" style="display: none;">${name}</div>
                <div id="${'gamePath-'+id}" style="display: none;">${gamePath}</div>
                <div id="${'iconPath-'+id}" style="display: none;">${iconPath}</div>
                <div id="${'pathClean-'+id}" style="display: none;">${pathClean}</div>
                <div id="${'argsClean-'+id}" style="display: none;">${argsClean}</div>
  
                <div style="width: 100%; height: 65%;">
                  <div style="height: 10%;"></div>
                  <img id="${img}" style="width: 90%; height: 90%; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: 100%; height: 35%; display: flex;">
                  <div style="width: 90%; margin: auto; font-size: calc(var(--size1)/9); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--textColor);">${name}</div>
                </div>
              </div>`
  return html
}

function createStoreHTML(id, img, icon, name) {
  let html = `<div id="${id}" style="min-width: var(--size1); height: calc(var(--size1)/4*5); min-height: 250px; margin-top: 5px; margin-right: 5px; background-image: url('./Data/Images/icon_store_item.png'); background-repeat: no-repeat; background-size: cover; text-align: center; display: inline-block;">
                <div style="width: var(--size1); height: 80%;">
                  <img id="${img}" style="width: 90%; height: 95%; margin: 10px; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: var(--size1); height: 20%; display: flex;">
                  <div style="width: 90%; margin: auto; font-size: calc(var(--size1)/12); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${name}</div>
                </div>
              </div>`
  return html
}

function createStoreHTML2(id, img, icon, name, info) {
  let html = `<div id="${id}" style="min-width: var(--size1); height: calc(var(--size1)/4*5); min-height: 250px; margin-top: 5px; margin-right: 5px; background-image: url('./Data/Images/icon_store_item.png'); background-repeat: no-repeat; background-size: cover; text-align: center; display: inline-block;">
                <div style="width: var(--size1); height: 80%;">
                  <img id="${img}" style="width: 90%; height: 95%; margin: 10px; object-fit: contain; -webkit-user-drag: none;" src="${icon}"></img>
                </div>
                <div style="width: var(--size1); height: 20%; display: flex;">
                  <div style="width: 100%; margin: auto;">
                    <div style="width: 90%; margin: auto; font-size: calc(var(--size1)/12); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</div>
                    <div style="width: 90%; margin: auto; font-size: calc(var(--size1)/15); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-top: 2px;">${info}</div>
                  </div>
                </div>
              </div>`
  return html
}

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