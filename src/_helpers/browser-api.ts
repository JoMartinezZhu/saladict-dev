/**
 * @file Wraps some of the extension apis
 */

// import { Observable, fromEventPattern } from 'rxjs'
// import { map } from 'rxjs/operators'
import { Observable } from 'rxjs/Observable'
import { fromEventPattern } from 'rxjs/observable/fromEventPattern'
import { map } from 'rxjs/operators/map'
import { filter } from 'rxjs/operators/filter'

import { MsgType } from '@/typings/message'

/* --------------------------------------- *\
 * #Types
\* --------------------------------------- */

export type StorageArea = 'all' | 'local' | 'sync'

export type StorageChange<T> = {
  oldValue?: T,
  newValue?: T,
}

export type StorageUpdate<T> = {
  oldValue?: T,
  newValue: T,
}

export type StorageListenerCb<T = any, K extends string = string> = (
  changes: {
    [field in K]: StorageChange<T>
  },
  areaName: 'sync' | 'local',
) => void

export interface Message {
  type: MsgType
  [propName: string]: any
}

type onMessageEvent<T extends Message = Message> = (
  message: T,
  sender: browser.runtime.MessageSender,
) => Promise<any> | boolean | void

/* --------------------------------------- *\
 * #Globals
\* --------------------------------------- */

const noop = () => { /* do nothing */ }

/**
 * key: {function} user's callback function
 * values: {Map} listeners, key: message type, values: generated or user's callback functions
 */
const messageListeners: Map<onMessageEvent, Map<Message['type'], onMessageEvent>> = new Map()

/**
 * For self page messaging
 * key: {function} user's callback function
 * values: {Map} listeners, key: message type, values: generated or user's callback functions
 */
const messageSelfListeners: Map<onMessageEvent, Map<Message['type'], onMessageEvent>> = new Map()

/**
 * key: {function} user's callback function
 * values: {Map} listeners, key: message type, values: generated or user's callback functions
 */
const storageListeners: Map<StorageListenerCb, Map<string, StorageListenerCb>> = new Map()

/* --------------------------------------- *\
 * #Exports
\* --------------------------------------- */

export const storage = {
  sync: {
    clear: storageClear,
    remove: storageRemove,
    get: storageGet,
    set: storageSet,
    /** Only for sync area */
    addListener: storageAddListener,
    /** Only for sync area */
    removeListener: storageRemoveListener,
    createStream: storageCreateStream,
    get __storageArea__ (): 'sync' { return 'sync' },
  },
  local: {
    clear: storageClear,
    remove: storageRemove,
    get: storageGet,
    set: storageSet,
    /** Only for local area */
    addListener: storageAddListener,
    /** Only for local area */
    removeListener: storageRemoveListener,
    createStream: storageCreateStream,
    get __storageArea__ (): 'local' { return 'local' },
  },
  /** Clear all area */
  clear: storageClear,
  addListener: storageAddListener,
  removeListener: storageRemoveListener,
  createStream: storageCreateStream,
  get __storageArea__ (): 'all' { return 'all' },
}

/**
 * Wraps in-app runtime.sendMessage and tabs.sendMessage
 * Does not warp cross extension messaging!
 */
export const message = {
  send: messageSend,
  addListener: messageAddListener,
  removeListener: messageRemoveListener,
  createStream: messageCreateStream,
  get __self__ (): false { return false },

  self: {
    initClient,
    initServer,
    send: messageSendSelf,
    addListener: messageAddListener,
    removeListener: messageRemoveListener,
    createStream: messageCreateStream,
    get __self__ (): true { return true },
  }
}

/**
 * Open a url on new tab or highlight a existing tab if already opened
 */
export async function openURL (url: string, self?: boolean): Promise<void> {
  if (self) { url = browser.runtime.getURL(url) }
  const tabs = await browser.tabs.query({ url })
  // Only Chrome supports tab.highlight for now
  if (tabs.length > 0 && typeof browser.tabs.highlight === 'function') {
    const { index, windowId } = tabs[0]
    await browser.tabs.highlight({ tabs: index, windowId })
    await browser.windows.update(windowId, { focused: true })
  } else {
    await browser.tabs.create({ url })
  }
}

export default {
  openURL,
  storage,
  message
}

/* --------------------------------------- *\
 * #Storage
\* --------------------------------------- */
type StorageThisTwo = typeof storage.sync | typeof storage.local
type StorageThisThree = StorageThisTwo | typeof storage

function storageClear (): Promise<void>
function storageClear (this: StorageThisThree): Promise<void> {
  return this.__storageArea__ === 'all'
    ? Promise.all([
      browser.storage.local.clear(),
      browser.storage.sync.clear(),
    ]).then(noop)
    : browser.storage[this.__storageArea__].clear()
}

function storageRemove (keys: string | string[]): Promise<void>
function storageRemove (this: StorageThisTwo, keys: string | string[]): Promise<void> {
  return browser.storage[this.__storageArea__].remove(keys)
}

function storageGet<T = any> (key?: string | string[] | null): Promise<Partial<T>>
function storageGet<T extends Object> (key: T | any): Promise<Partial<T>>
function storageGet<T = any> (this: StorageThisTwo, ...args): Promise<Partial<T>> {
  return browser.storage[this.__storageArea__].get(...args)
}

function storageSet (keys: any): Promise<void>
function storageSet (this: StorageThisTwo, keys: any): Promise<void> {
  return browser.storage[this.__storageArea__].set(keys)
}

function storageAddListener<T = any> (cb: StorageListenerCb<T>): void
function storageAddListener<T = any, K extends string = string> (key: K, cb: StorageListenerCb<T, K>): void
function storageAddListener (this: StorageThisThree, ...args): void {
  let key: string
  let cb: StorageListenerCb
  if (typeof args[0] === 'function') {
    key = ''
    cb = args[0]
  } else if (typeof args[0] === 'string' && typeof args[1] === 'function') {
    key = args[0]
    cb = args[1]
  } else {
    throw new Error('wrong arguments type')
  }

  let listeners = storageListeners.get(cb)
  if (!listeners) {
    listeners = new Map()
    storageListeners.set(cb, listeners)
  }
  const listenerKey = this.__storageArea__ + key
  let listener = listeners.get(listenerKey)
  if (!listener) {
    listener = (changes, areaName) => {
      if ((this.__storageArea__ === 'all' || areaName === this.__storageArea__) &&
          (!key || key in changes)
      ) {
        cb(changes, areaName)
      }
    }
    listeners.set(listenerKey, listener)
  }
  return browser.storage.onChanged.addListener(listener)
}

function storageRemoveListener (key: string, cb: StorageListenerCb): void
function storageRemoveListener (cb: StorageListenerCb): void
function storageRemoveListener (this: StorageThisThree, ...args): void {
  let key: string
  let cb: StorageListenerCb
  if (typeof args[0] === 'function') {
    key = ''
    cb = args[0]
  } else if (typeof args[0] === 'string' && typeof args[1] === 'function') {
    key = args[0]
    cb = args[1]
  } else {
    throw new Error('wrong arguments type')
  }

  const listeners = storageListeners.get(cb)
  if (listeners) {
    if (key) {
      // remove 'cb' listeners with 'key' under 'storageArea'
      const listenerKey = this.__storageArea__ + key
      const listener = listeners.get(listenerKey)
      if (listener) {
        browser.storage.onChanged.removeListener(listener)
        listeners.delete(listenerKey)
        if (listeners.size <= 0) {
          storageListeners.delete(cb)
        }
        return
      }
    } else {
      // remove all 'cb' listeners under 'storageArea'
      listeners.forEach(listener => {
        browser.storage.onChanged.removeListener(listener)
      })
      storageListeners.delete(cb)
      return
    }
  }
  browser.storage.onChanged.removeListener(cb)
}

function storageCreateStream<T = any> (key: string): Observable<StorageChange<T>>
function storageCreateStream (this: StorageThisThree, key: string) {
  if (!key) { throw new Error('Missing key') }
  return fromEventPattern(
    handler => this.addListener(key, handler as StorageListenerCb),
    handler => this.removeListener(key, handler as StorageListenerCb),
  ).pipe(
    filter(args => (Array.isArray(args) ? args[0] : args).hasOwnProperty(key)),
    map(args => Array.isArray(args) ? args[0][key] : args[key]),
  )
}

/* --------------------------------------- *\
 * #Message
\* --------------------------------------- */
type MessageThis = typeof message | typeof message.self

function messageSend<T extends Message, U = any> (tabId: number, message: T): Promise<U>
function messageSend<T extends Message, U = any> (message: T): Promise<U>
function messageSend (...args): Promise<any> {
  return (
    args.length === 1
      ? browser.runtime.sendMessage(args[0])
      : browser.tabs.sendMessage(args[0], args[1])
  ).catch(err => {
    if (process.env.DEV_BUILD) {
      console.warn(err, ...args)
    } else if (process.env.NODE_ENV !== 'production') {
      return Promise.reject(err) as any
    }
  })
}

async function messageSendSelf<T extends Message, U = any> (message: T): Promise<U> {
  if (window.pageId === undefined) {
    await initClient()
  }
  return browser.runtime.sendMessage(Object.assign({}, message, {
    __pageId__: window.pageId,
    type: `[[${message.type}]]`
  })).catch(err => {
    if (process.env.DEV_BUILD) {
      console.warn(err, message)
    } else if (process.env.NODE_ENV !== 'production') {
      return Promise.reject(err) as any
    }
  })
}

function messageAddListener<T extends Message = Message> (messageType: Message['type'], cb: onMessageEvent<T>): void
function messageAddListener<T extends Message = Message> (cb: onMessageEvent<T>): void
function messageAddListener (this: MessageThis, ...args): void {
  if (window.pageId === undefined) {
    initClient()
  }
  const allListeners = this.__self__ ? messageSelfListeners : messageListeners
  const messageType = args.length === 1 ? undefined : args[0]
  const cb = args.length === 1 ? args[0] : args[1]
  let listeners = allListeners.get(cb)
  if (!listeners) {
    listeners = new Map()
    allListeners.set(cb, listeners)
  }
  let listener = listeners.get(messageType || MsgType.Default)
  if (!listener) {
    listener = (
      (message, sender) => {
        if (message && (this.__self__ ? window.pageId === message.__pageId__ : !message.__pageId__)) {
          if (messageType == null || message.type === messageType) {
            return cb(message, sender)
          }
        }
      }
    ) as onMessageEvent
    listeners.set(messageType, listener)
  }
  return browser.runtime.onMessage.addListener(listener)
}

function messageRemoveListener (messageType: Message['type'], cb: onMessageEvent): void
function messageRemoveListener (cb: onMessageEvent): void
function messageRemoveListener (this: MessageThis, ...args): void {
  const allListeners = this.__self__ ? messageSelfListeners : messageListeners
  const messageType = args.length === 1 ? undefined : args[0]
  const cb = args.length === 1 ? args[0] : args[1]
  const listeners = allListeners.get(cb)
  if (listeners) {
    if (messageType) {
      const listener = listeners.get(messageType)
      if (listener) {
        browser.runtime.onMessage.removeListener(listener)
        listeners.delete(messageType)
        if (listeners.size <= 0) {
          allListeners.delete(cb)
        }
        return
      }
    } else {
      // delete all cb related callbacks
      listeners.forEach(listener => browser.runtime.onMessage.removeListener(listener))
      allListeners.delete(cb)
      return
    }
  }
  browser.runtime.onMessage.removeListener(cb)
}

function messageCreateStream<T = any> (messageType?: Message['type']): Observable<T>
function messageCreateStream (this: MessageThis, messageType = MsgType.Null) {
  const pattern$ = messageType !== MsgType.Null
    ? fromEventPattern(
      handler => this.addListener(messageType, handler as onMessageEvent),
      handler => this.removeListener(messageType, handler as onMessageEvent),
    )
    : fromEventPattern(
      handler => this.addListener(handler as onMessageEvent),
      handler => this.removeListener(handler as onMessageEvent),
    )

  return pattern$.pipe(map(args => Array.isArray(args) ? args[0] : args))
}

/**
 * Deploy page script for self-messaging
 * This method is called on the first sendMessage
 */
function initClient (): Promise<typeof window.pageId> {
  if (window.pageId === undefined) {
    return browser.runtime.sendMessage({ type: MsgType.__PageInfo__ })
      .then(({ pageId, faviconURL, pageTitle, pageURL }) => {
        window.pageId = pageId
        window.faviconURL = faviconURL
        if (pageTitle) { window.pageTitle = pageTitle }
        if (pageURL) { window.pageURL = pageURL }
        return pageId
      })
  } else {
    return Promise.resolve(window.pageId)
  }
}

/**
 * Deploy background proxy for self-messaging
 * This method should be invoked in background script
 */
function initServer (): void {
  window.pageId = 'background page'
  const selfMsgTester = /^\[\[(.+)\]\]$/

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!message) { return }

    if (message.type === MsgType.__PageInfo__) {
      return Promise.resolve(_getPageInfo(sender))
    }

    const selfMsg = selfMsgTester.exec(message.type)
    if (selfMsg) {
      const msgType = Number(selfMsg[1])
      message.type = isNaN(msgType) ? selfMsg[1] : msgType as MsgType
      const tabId = sender.tab && sender.tab.id
      if (tabId) {
        return messageSend(tabId, message)
      } else {
        return messageSend(message)
      }
    }
  })
}

function _getPageInfo (sender) {
  const result = {
    pageId: '',
    faviconURL: '',
    pageTitle: '',
    pageURL: '',
  }
  const tab = sender.tab
  if (tab) {
    result.pageId = tab.id
    if (tab.favIconUrl) { result.faviconURL = tab.favIconUrl }
    if (tab.url) { result.pageURL = tab.url }
    if (tab.title) { result.pageTitle = tab.title }
  } else {
    // FRAGILE: Assume only browser action page is tabless
    result.pageId = 'popup'
    if (sender.url && !sender.url.startsWith('http')) {
      result.faviconURL = 'https://raw.githubusercontent.com/crimx/ext-saladict/2ba9d2e85ad4ac2e4bb16ee43498ac4b58ed21a6/public/static/icon-16.png'
    }
  }
  return result
}
