import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { fetchItems } from './helpers/classes/steam/items/getCommands';
import os from 'os';
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import { isLoggedInElsewhere } from './helpers/classes/steam/items/steam';
import { getGithubVersion } from './scripts/versionHelper';
import * as fs from 'fs';
import { login } from './helpers/classes/steam/steam';
import {
  storeUserAccount,
  deleteUserData,
  getValue,
  storeLoginKey,
  setValue,
  setAccountPosition,
} from './helpers/classes/steam/settings';
import { pricingEmitter, runItems, currencyCodes } from './helpers/classes/steam/pricing';
import { currency } from './helpers/classes/steam/currency';
import { tradeUps } from './helpers/classes/steam/tradeup';
// Define helpers
var ByteBuffer = require('bytebuffer');
const Protos = require('globaloffensive/protobufs/generated/_load.js');
const Language = require('globaloffensive/language.js');
const currencyClass = new currency();
let tradeUpClass = new tradeUps();

// Electron stuff
let mainWindow: BrowserWindow | null = null;
ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  let frameValue = true;
  if (process.platform == 'win32') {
    frameValue = false;
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1124,
    height: 850,
    minWidth: 1030,
    minHeight: 800,
    frame: frameValue,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
  });
  mainWindow.webContents.session.clearStorageData();

  ipcMain.on('download', (_event, info) => {
    let fileP = path.join(os.homedir(), '/Downloads/casemove.csv');

    fs.writeFileSync(fileP, info, 'utf-8');
    shell.showItemInFolder(fileP);
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    console.log(app.getVersion());
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  if (process.platform == 'linux') {
    mainWindow.removeMenu();
  }
};

/**
 * Add event listeners...
 */
// Windows actions

ipcMain.on('windowsActions', async (_event, message) => {
  if (message == 'min') {
    mainWindow?.minimize();
  }
  if (message == 'max') {
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  }
  if (message == 'close') {
    mainWindow?.close();
  }
});

let currentLocale = 'da-dk';

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
    // localStorage.clear();
  }
});

let myWindow = null as any;
const gotTheLock = app.requestSingleInstanceLock();
const reactNombers = false;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (myWindow) {
      if (myWindow.isMinimized()) myWindow.restore();
      myWindow.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      currentLocale = app.getLocale();
      console.log('Currentlocal', currentLocale);

      if (process.env.NODE_ENV === 'development' && reactNombers) {
        let reactDevToolsPath = '';
        // on windows
        console.log(process.platform);
        if (process.platform == 'win32') {
          reactDevToolsPath = path.join(
            os.homedir(),
            '/AppData/Local/Google/Chrome/User Data/Default/Extensions/lmhkpmbekcpmknklioeibfkpmmfibljd/3.0.9_0'
          );
        }

        // On linux
        if (process.platform == 'linux') {
          reactDevToolsPath = path.join(
            os.homedir(),
            '/.config/google-chrome/Default/Extensions/lmhkpmbekcpmknklioeibfkpmmfibljd/3.0.9_0'
          );
        }
        // on macOS
        if (process.platform == 'darwin') {
          reactDevToolsPath = path.join(
            os.homedir(),
            '/Library/Application Support/Google/Chrome/Default/Extensions/lmhkpmbekcpmknklioeibfkpmmfibljd/3.0.9_0'
          );
        }

        await session.defaultSession.loadExtension(reactDevToolsPath);
      }
      createWindow();
      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) createWindow();
      });
    })
    .catch(console.log);
}

/**
 * IPC...
 */

var fetchItemClass = new fetchItems();

// Version manager
let gitHub = 0;
ipcMain.on('needUpdate', async (event) => {
  try {
    if (gitHub == 0) {
      gitHub = parseInt(await getGithubVersion());
    }
    const version = parseInt(app.getVersion().toString().replaceAll('.', ''));

    if (gitHub > version) {
      event.reply('needUpdate-reply', [true, app.getVersion(), gitHub]);
    } else {
      event.reply('needUpdate-reply', [false, app.getVersion(), gitHub]);
    }
  } catch {
    event.reply('needUpdate-reply', [false, app.getVersion(), 0]);
    gitHub = 1;
  }
});

// Return 1 = Success
// Return 2 = Steam Guard
// Return 3 = Steam Guard wrong
// Return 4 = Wrong password
// Return 5 = Unknown
// Return 6 = Error with loginkey
ipcMain.on(
  'login',
  async (
    event,
    username,
    password = null,
    shouldRemember,
    steamGuard = null,
    secretKey = null
  ) => {
    let user = new SteamUser();
    let csgo = new GlobalOffensive(user);


    // Success
    user.once('loggedOn', () => {
      user.once('accountInfo', (displayName) => {
        console.log('Logged into Steam as ' + displayName);
        getValue('pricing.currency').then((returnValue) => {
          if (returnValue == undefined) {
            
            setValue('pricing.currency', currencyCodes?.[user.wallet.currency] || 'USD')
          }
        });
        isLoggedInElsewhere(user).then((returnValue) => {
          if (returnValue) {
            cancelLogin(user)
            event.reply('login-reply', [5]);
          } else {
            async function gameCoordinate(resolve: any = null) {
              csgo.once('connectedToGC', () => {
                if (resolve) {
                  resolve('GC');
                }
                console.log('Connected to GC!');
                if (csgo.haveGCSession) {
                  console.log('Have Session!');
                  fetchItemClass
                    .convertInventory(csgo.inventory)
                    .then((returnValue) => {
                      tradeUpClass
                        .getTradeUp(returnValue)
                        .then((newReturnValue: any) => {
                          let walletToSend = user.wallet
                          walletToSend.currency = currencyCodes?.[walletToSend.currency]
                          const returnPackage = [
                            user.logOnResult.client_supplied_steamid,
                            displayName,
                            csgo.haveGCSession,
                            newReturnValue,
                            walletToSend,
                          ];
                          startEvents(csgo, user);
                          if (shouldRemember) {
                            storeUserAccount(
                              username,
                              displayName,
                              password,
                              user.logOnResult.client_supplied_steamid,
                              secretKey
                            );
                          }

                          event.reply('login-reply', [1, returnPackage]);
                        });
                    });
                }
              });
            }

            // // Create a timeout race to catch an infinite loading error in case the Steam account hasnt added the CSGO license
            // Run the normal version
            startGameCoordinator();
            let GCResponse = new Promise((resolve) => {
              gameCoordinate(resolve);
            });
            // Run the timeout
            let timeout = new Promise((resolve, _reject) => {
              setTimeout(resolve, 10000, 'time');
            });

            // Race the two
            Promise.race([timeout, GCResponse]).then((value) => {
              if (value == 'time') {
                console.log(
                  'GC didnt start in time, adding CSGO to the library and retrying.'
                );
                user.requestFreeLicense(
                  [730],
                  function (err, packageIds, appIds) {
                    if (err) {
                      console.log(err);
                      event.reply('login-reply', [5]);
                    }
                    console.log('Granted package: ', packageIds);
                    console.log('Granted App: ', appIds);
                    startGameCoordinator();
                    // gameCoordinate();
                  }
                );
              }
            });
          }
        });
      });
    });

    // Should remember
    if (shouldRemember) {
      user.once('loginKey', function(key) {
        storeLoginKey(username, key)

      })
    }

    // Steam guard
    user.once('steamGuard', function (domain, callback, lastCodeWrong) {
      domain;
      callback;
      if (lastCodeWrong) {
        console.log('Last code wrong, try again!');
        cancelLogin(user)
        event.reply('login-reply', [3]);
      } else {
        cancelLogin(user)
        event.reply('login-reply', [2]);
      }
    });

    // Default error
    user.once('error', (_error) => {
      cancelLogin(user)
    });


    // Login
    let loginClass = new login()
    loginClass.mainLogin(user, username, shouldRemember, password, steamGuard, secretKey).then((returnValue) => {
      event.reply('login-reply', returnValue);
    })
    // Start the game coordinator for CSGO
    async function startGameCoordinator() {
      user.gamesPlayed([]);
      user.gamesPlayed([730]);
    }
  }
);

async function cancelLogin(user) {
  user.removeAllListeners('loggedOn');
  user.removeAllListeners('loginKey');
  user.removeAllListeners('steamGuard');
  user.removeAllListeners('error');
}


// Adds events listeners the user
// Forward Steam notifications to renderer
async function startEvents(csgo, user) {
  // Pricing
  const pricing = new runItems(user);
  pricingEmitter.on('result', (message) => {
    mainWindow?.webContents.send('pricing', [message]);
  });
  ipcMain.on('getPrice', async (_event, info) => {
    pricing.handleItem(info);
  });

  // Trade up handlers
  ipcMain.on('getTradeUpPossible', async (event, itemsToGet) => {
    tradeUpClass.getPotentitalOutcome(itemsToGet).then((returnValue) => {
      pricing.handleTradeUp(returnValue);
      event.reply('getTradeUpPossible-reply', returnValue);
    });
  });
  ipcMain.on('processTradeOrder', async (_event, idsToProcess, rarityToUse) => {
    const rarObject = {
      0: '00000A00',
      1: '01000A00',
      2: '02000A00',
      3: '03000A00',
      4: '04000A00',
      10: '0a000a00',
      11: '0b000a00',
      12: '0c000a00',
      13: '0d000a00',
      14: '0e000a00',
    };
    let idsToUse = [] as any;
    idsToProcess.forEach((element) => {
      idsToUse.push(parseInt(element));
    });
    let tradeupPayLoad = new ByteBuffer(
      1 + 2 + idsToUse.length * 8,
      ByteBuffer.LITTLE_ENDIAN
    );
    tradeupPayLoad.append(rarObject[rarityToUse], 'hex');
    for (let id of idsToUse) {
      tradeupPayLoad.writeUint64(id);
    }
    await csgo._send(Language.Craft, null, tradeupPayLoad);
  });

  // Open container
  ipcMain.on('openContainer', async (_event, itemsToOpen) => {
    let containerPayload = new ByteBuffer(16, ByteBuffer.LITTLE_ENDIAN);
    containerPayload.append('0000000000000000', 'hex');
    for (let id of itemsToOpen) {
      containerPayload.writeUint64(parseInt(id));
    }
    await csgo._send(Language.UnlockCrate, null, containerPayload);
  });



  // CSGO listeners
  // Inventory events
  csgo.on('itemRemoved', (item) => {
    if (!Object.keys(item).includes('casket_id')) {
      console.log('Item' + item.itemid + ' was removed');
      fetchItemClass.convertInventory(csgo.inventory).then((returnValue) => {
        tradeUpClass.getTradeUp(returnValue).then((newReturnValue: any) => {
          mainWindow?.webContents.send('userEvents', [
            1,
            'itemRemoved',
            [item, newReturnValue],
          ]);
        });
      });
    }
  });

  csgo.on('itemChanged', (item) => {
    console.log('Item' + item.itemid + ' was changed');
    fetchItemClass.convertInventory(csgo.inventory).then((returnValue) => {
      tradeUpClass.getTradeUp(returnValue).then((newReturnValue: any) => {
        mainWindow?.webContents.send('userEvents', [
          1,
          'itemChanged',
          [item, newReturnValue],
        ]);
      });
    });
  });

  csgo.on('itemAcquired', (item) => {
    if (!Object.keys(item).includes('casket_id')) {
      console.log('Item' + item.itemid + ' was acquired');
      fetchItemClass.convertInventory(csgo.inventory).then((returnValue) => {
        tradeUpClass.getTradeUp(returnValue).then((newReturnValue: any) => {
          mainWindow?.webContents.send('userEvents', [
            1,
            'itemAcquired',
            [item, newReturnValue],
          ]);
        });
      });
    }
  });

  csgo.on('disconnectedFromGC', (reason) => {
    console.log('Disconnected from GC - reason: ', reason);
    mainWindow?.webContents.send('userEvents', [
      3,
      'disconnectedFromGC',
      [reason],
    ]);
  });

  csgo.on('connectedToGC', () => {
    console.log('Connected to GC!');
    if (csgo.haveGCSession) {
      mainWindow?.webContents.send('userEvents', [3, 'connectedToGC']);
    }
  });

  // User listeners
  // Steam Connection
  user.on('error', (eresult, msg) => {
    console.log(eresult, msg);
    mainWindow?.webContents.send('userEvents', [2, 'fatalError']);
    clearForNewSession();
  });
  user.on('disconnected', (eresult, msg) => {
    console.log(eresult, msg);
    mainWindow?.webContents.send('userEvents', [2, 'disconnected']);
  });
  user.on('loggedOn', () => {
    mainWindow?.webContents.send('userEvents', [2, 'reconnected']);
  });
  user.on('wallet', () => {
    let walletToSend = user.wallet
    walletToSend.currency = currencyCodes?.[walletToSend.currency]
    mainWindow?.webContents.send('userEvents', [4, walletToSend]);
  });

  // Get commands from Renderer
  ipcMain.on('refreshInventory', async () => {
    fetchItemClass.convertInventory(csgo.inventory).then((returnValue) => {
      tradeUpClass.getTradeUp(returnValue).then((newReturnValue) => {
        mainWindow?.webContents.send('userEvents', [
          1,
          'itemAcquired',
          [{}, newReturnValue],
        ]);
      });
    });
  });
  // Retry connection
  ipcMain.on('retryConnection', async () => {
    user.gamesPlayed([]);
    user.gamesPlayed([730]);
    console.log('Retrying');
  });
  // Rename Storage units
  ipcMain.on('renameStorageUnit', async (event, itemID, newName) => {
    csgo.nameItem(0, itemID, newName);
    csgo.once('itemCustomizationNotification', (itemIds, notificationType) => {
      if (
        notificationType ==
        GlobalOffensive.ItemCustomizationNotification.NameItem
      ) {
        event.reply('renameStorageUnit-reply', [1, itemIds[0]]);
      }
    });
  });

  // Set item positions
  ipcMain.on('setItemsPositions', async (_event, dictOfItems) => {
    await csgo._send(
      Language.SetItemPositions,
      Protos.CMsgSetItemPositions,
      dictOfItems
    );
  });

  // Set item positions
  ipcMain.on(
    'setItemEquipped',
    async (_event, item_id, item_name, itemClass) => {
      item_name;

      await csgo._send(
        Language.k_EMsgGCAdjustItemEquippedState,
        Protos.CMsgAdjustItemEquippedState,
        {
          item_id: item_id,
          new_class: itemClass,
          new_slot: 0,
          swap: 0,
        }
      );
    }
  );

  // Remove items from storage unit
  ipcMain.on(
    'removeFromStorageUnit',
    async (event, casketID, itemID, fastMode) => {
      csgo.removeFromCasket(casketID, itemID);
      if (fastMode == false) {
        csgo.once(
          'itemCustomizationNotification',
          (itemIds, notificationType) => {
            if (
              notificationType ==
              GlobalOffensive.ItemCustomizationNotification.CasketRemoved
            ) {
              console.log(itemIds + ' removed from storage unit');
              event.reply('removeFromStorageUnit-reply', [1, itemIds[0]]);
            }
          }
        );
      }
    }
  );



  // Move to Storage Unit
  ipcMain.on('moveToStorageUnit', async (event, casketID, itemID, fastMode) => {
    csgo.addToCasket(casketID, itemID);
    if (fastMode == false) {
      csgo.once(
        'itemCustomizationNotification',
        (itemIds, notificationType) => {
          if (
            notificationType ==
            GlobalOffensive.ItemCustomizationNotification.CasketAdded
          ) {
            console.log(itemIds[0] + ' added to storage unit');
            event.reply('moveToStorageUnit-reply', [1, itemIds[0]]);
          }
        }
      );
    }
  });

  // Get storage unit contents
  ipcMain.on('getCasketContents', async (event, casketID, _casketName) => {
    await csgo.getCasketContents(casketID, async function (err, items) {
      fetchItemClass.convertStorageData(items).then((returnValue) => {
        tradeUpClass.getTradeUp(returnValue).then((newReturnValue: any) => {
          event.reply('getCasketContent-reply', [1, newReturnValue]);
          console.log('Casket contains: ', newReturnValue.length);
        });
      });

      if (err) {
        event.reply('getCasketContent-reply', [0]);
      }
    });
  });
  // Get commands from Renderer
  ipcMain.on('signOut', async () => {
    clearForNewSession();
  });

  async function clearForNewSession() {
    console.log('Signout');
    // Remove for CSGO
    csgo.removeAllListeners('itemRemoved');
    csgo.removeAllListeners('itemChanged');
    csgo.removeAllListeners('itemAcquired');
    csgo.removeAllListeners('connectedToGC');
    csgo.removeAllListeners('disconnectedFromGC');

    user.logOff();
    pricingEmitter.removeAllListeners('result');
    // Remove for user
    user.removeAllListeners('error');
    user.removeAllListeners('disconnected');
    user.removeAllListeners('loggedOn');

    // IPC
    ipcMain.removeAllListeners('renameStorageUnit');
    ipcMain.removeAllListeners('removeFromStorageUnit');
    ipcMain.removeAllListeners('moveToStorageUnit');
    ipcMain.removeAllListeners('getCasketContents');
    ipcMain.removeAllListeners('signOut');
  }
}
// Get currency
ipcMain.on('getCurrency', async (event) => {
  getValue('pricing.currency').then((returnValue) => {
    
    currencyClass.getRate(returnValue).then((response) => {
      console.log(returnValue, response);
      event.reply('getCurrency-reply', [returnValue, response]);
    });
  });
});
// setValue('darkmode.hasSet', false)
// Set dark mode
async function darkModeSetup() {
  getValue('darkmode.hasSet').then((returnValue) => {
    console.log('darkmodeunset', returnValue);
    if (returnValue == false || returnValue == undefined) {
      setValue('darkmode.value', true);
    }
  });
  getValue('fastmove').then((returnValue) => {
    if (returnValue == undefined) {
      console.log('fastmove', returnValue);
      setValue('fastmove', false);
    }
  });
}
darkModeSetup();

// Set platform
setValue('os', process.platform);

// Kinda store
ipcMain.on('electron-store-getAccountDetails', async (event) => {
  const accountDetails = await getValue('account');
  event.returnValue = event.reply(
    'electron-store-getAccountDetails-reply',
    accountDetails
  );
});

ipcMain.on('electron-store-deleteAccountDetails', async (_event, username) => {
  deleteUserData(username);
});

ipcMain.on(
  'electron-store-setAccountPosition',
  async (_event, username, position) => {
    setAccountPosition(username, position);
  }
);

// Store IPC
ipcMain.on('electron-store-get', async (event, val, key) => {
  if (val == 'locale') {
    event.reply('electron-store-get-reply' + key, currentLocale);
    return;
  }
  getValue(val).then((returnValue) => {
    event.reply('electron-store-get-reply' + key, returnValue);
  });
});
ipcMain.on('electron-store-set', async (event, key, val) => {
  event;
  setValue(key, val);
});
