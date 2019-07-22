import UAParser from 'ua-parser-js'

interface Ga {
  (...args: any[]): void
  l: number
  q: any[]
}

declare global {
  interface Window {
    ga?: Ga
  }
}

export function injectAnalytics (page: string, win = window as Window & { ga?: Ga }) {
  if (process.env.DEV_BUILD ||
      process.env.NODE_ENV === 'test' ||
      !process.env.SDAPP_ANALYTICS ||
      win.ga
  ) {
    return
  }

  const ua = new UAParser()
  const browser = ua.getBrowser()
  const os = ua.getOS()

  win.ga = win.ga || function () {
    (win.ga!.q = win.ga!.q || []).push(arguments)
  } as Ga
  win.ga.l = Date.now()

  win.ga('create', process.env.SDAPP_ANALYTICS, 'auto')

  win.ga('set', 'checkProtocolTask', null)
  win.ga('set', 'transport', 'beacon')

  win.ga('set', 'dimension1', browser.name || 'None')
  win.ga('set', 'dimension2', (browser.version || '0.0').split('.').slice(0, 3).join('.'))

  win.ga('set', 'dimension3', os.name || 'None')
  win.ga('set', 'dimension4', os.version || '0.0')

  win.ga('send', 'pageview', page)

  const $ga = win.document.createElement('script')
  $ga.type = 'text/javascript'
  $ga.async = true
  $ga.src = `https://www.google-analytics.com/analytics.js`
  win.document.body.appendChild($ga)
}
