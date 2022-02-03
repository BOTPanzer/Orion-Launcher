const { app, ipcMain, BrowserWindow } = require('electron')
const superagent = require('superagent');
const fs = require('fs');
let launcher = true
let win = null


function createWindow(_height, _width) {
  win = new BrowserWindow({
    height: 550,
    width: 1040,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('main.html')
  win.removeMenu()
  //win.openDevTools()
  launcher = true
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.on('store', (event) => {
    win.loadFile('store.html')
    launcher = false
  })

  ipcMain.on('launcher', (event) => {
    win.loadFile('main.html')
    launcher = true
  })

  win.webContents.on('dom-ready', () => {
    if (launcher) {
      createListFromFolder(dataFolder)
    }
  });
  
  //FUNCTIONS LAUNCHER
  let dataFolder = app.getAppPath()+'\\Launcher\\'
  
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

  
  //FUNCTIONS STORE
  ipcMain.on('searchGames', (event, orSearch) => {
    win.webContents.send('clearList');

    let search = orSearch.replaceAll(' ', '+')

    let fullURL = 'https://www.elamigos-games.com/?q='+search
    getHTML(fullURL).then(function(result) {
      elamigos(result)
    })

    fullURL = 'https://fitgirlrepacks.co/search/'+search
    getHTML(fullURL).then(function(result) {
      fitgirl(result)
    })

    fullURL = 'https://pivigames.blog/?s='+search
    getHTML(fullURL).then(function(result) {
      pivi(result)
    })

    fullURL = 'https://www.skidrowcodex.net/game-list/'
    getHTML(fullURL).then(function(result) {
      skidrow(result, orSearch)
    })
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
  }

  async function fitgirl(result) {
    let part = result.substring(result.indexOf('<header class="page-header">'), result.indexOf('<nav class="navigation paging-navigation"'))
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
      const response = await superagent.get(link)
      let html = response.text
      
      let img = html.substring(html.indexOf('<h1 class="entry-title">'))
      img = img.substring(img.indexOf('src="')+5)
      img = img.substring(0, img.indexOf('"'))
      return img
    }
  }

  function pivi(result) {
    let part = result.substring(result.indexOf('<section class="gp-post-item gp-standard-post'), result.indexOf("<div class='code-block code-block-7'"))
    var si = part.split('<section')
    var links = []
    var imgs = []
    var names = []
    //LINKS & IMAGES
    for(i in si) {
      if (links.length == 10) break
      if (!si[i].includes('https://pivigames.blog/estrenos') && !si[i].includes('https://pivigames.blog/tops') && !si[i].includes('https://pivigames.blog/promociones')) {
        let link = si[i].substring(si[i].indexOf('href="')+6)
        link = link.substring(0, link.indexOf('"')-1)
        let img = si[i].substring(si[i].indexOf('src="')+5)
        img = img.substring(0, img.indexOf('"'))
        if (link != '' && img != '') {
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
  }

  function skidrow(result, search) {
    let part = result.substring(result.indexOf('<h2 style="text-align: center;">'), result.indexOf('<footer class="container">'))
    var si = part.split('<li >')
    var links = []
    var names = []
    //LINKS & NAMES
    for(i in si) {
      if (links.length == 10) break
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
  }

  async function getHTML(url) {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})