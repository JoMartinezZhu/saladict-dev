/**
 * Open pdf link directly
 */

import { AppConfig } from '@/app-config'
import { addConfigListener } from '@/_helpers/config-manager'

let blacklist: AppConfig['pdfBlacklist'] = []
let whitelist: AppConfig['pdfWhitelist'] = []

export function init (config: AppConfig) {
  if (browser.webRequest.onBeforeRequest.hasListener(otherPdfListener)) {
    return
  }

  blacklist = config.pdfBlacklist
  whitelist = config.pdfWhitelist

  if (config.pdfSniff) {
    startListening()
  }

  addConfigListener(({ newConfig, oldConfig }) => {
    if (newConfig) {
      blacklist = newConfig.pdfBlacklist
      whitelist = newConfig.pdfWhitelist

      if (!oldConfig || newConfig.pdfSniff !== oldConfig.pdfSniff) {
        if (newConfig.pdfSniff) {
          startListening()
        } else {
          stopListening()
        }
      }
    }
  })
}

function startListening () {
  if (!browser.webRequest.onBeforeRequest.hasListener(otherPdfListener)) {
    browser.webRequest.onBeforeRequest.addListener(
      otherPdfListener,
      {
        urls: [
          'ftp://*/*.pdf',
          'ftp://*/*.PDF',
          'file://*/*.pdf',
          'file://*/*.PDF'
        ],
        types: ['main_frame', 'sub_frame']
      },
      ['blocking']
    )
  }

  if (!browser.webRequest.onHeadersReceived.hasListener(httpPdfListener)) {
    browser.webRequest.onHeadersReceived.addListener(
      httpPdfListener,
      {
        urls: [
          'https://*/*',
          'https://*/*',
          'http://*/*',
          'http://*/*'
        ],
        types: ['main_frame', 'sub_frame']
      },
      ['blocking', 'responseHeaders']
    )
  }
}

function stopListening () {
  browser.webRequest.onBeforeRequest.removeListener(otherPdfListener)
  browser.webRequest.onHeadersReceived.removeListener(httpPdfListener)
}

function otherPdfListener ({ url }) {
  if (blacklist.some(([r]) => new RegExp(r).test(url)) &&
      whitelist.every(([r]) => !new RegExp(r).test(url))) {
    return
  }

  return {
    redirectUrl: browser.runtime.getURL(`static/pdf/web/viewer.html?file=${encodeURIComponent(url)}`)
  }
}

function httpPdfListener ({ responseHeaders, url }: { responseHeaders?: browser.webRequest.HttpHeaders, url: string }) {
  if (!responseHeaders) { return }
  if (blacklist.some(([r]) => new RegExp(r).test(url)) &&
      whitelist.every(([r]) => !new RegExp(r).test(url))) {
    return
  }

  const contentTypeHeader = responseHeaders.find(({ name }) => name.toLowerCase() === 'content-type')
  if (contentTypeHeader && contentTypeHeader.value) {
    const contentType = contentTypeHeader.value.toLowerCase()
    if (
      contentType.endsWith('pdf') ||
      (contentType === 'application/octet-stream' && url.endsWith('.pdf'))
    ) {
      return {
        redirectUrl: browser.runtime.getURL(`static/pdf/web/viewer.html?file=${encodeURIComponent(url)}`)
      }
    }
  }
}
