import { fetchDirtyDOM } from '@/_helpers/fetch-dom'
import {
  HTMLString,
  getInnerHTMLBuilder,
  // getOuterHTMLBuilder,
  getFullLinkBuilder,
  handleNoResult,
  getText,
  handleNetWorkError,
  SearchFunction,
  GetSrcPageFunction,
} from '../helpers'
import { DictSearchResult } from '@/typings/server'
import { DictConfigs } from '@/app-config'

export const getSrcPage: GetSrcPageFunction = text => {
  return 'http://dict.cnki.net/dict_result.aspx?searchword=' + encodeURIComponent(text)
}

const getInnerHTML = getInnerHTMLBuilder('http://dict.cnki.net')
// const getOuterHTML = getOuterHTMLBuilder('http://dict.cnki.net')
const getFullLink = getFullLinkBuilder('http://dict.cnki.net')

interface CNKIDictItem {
  word: string
  href: string
}

interface CNKISensItem {
  title: string
  more: string
  sens: HTMLString[]
}

export interface CNKIResult {
  dict: CNKIDictItem[]
  senbi: CNKISensItem[]
  seneng: CNKISensItem[]
  // digests?: {
  //   more: string
  //   content: HTMLString
  // }
}

type CNKISearchResult = DictSearchResult<CNKIResult>

export const search: SearchFunction<CNKISearchResult> = (
  text, config, profile, payload
) => {
  return fetchDirtyDOM(
    'http://dict.cnki.net/dict_result.aspx?searchword=' + encodeURIComponent(text),
    { credentials: 'omit' },
  )
    .catch(handleNetWorkError)
    .then(doc => handleDOM(doc, profile.dicts.all.cnki.options))
}

function handleDOM (
  doc: Document, options: DictConfigs['cnki']['options']
): CNKISearchResult | Promise<CNKISearchResult> {
  const $entries = [...doc.querySelectorAll('.main-table')]

  const result: CNKIResult = {
    dict: [],
    senbi: extractSens($entries, 'img[src="images/word.jpg"]', 'showjd_'),
    seneng: extractSens($entries, 'img[src="images/dian_ywlj.gif"]', 'showlj_'),
  }

  if (options.dict) {
    const $dict = $entries.find($e => Boolean($e.querySelector('img[src="images/02.gif"]')))
    if ($dict) {
      result.dict = [...$dict.querySelectorAll('.zztj li')]
        .map($li => {
          const word = ($li.textContent || '').trim()
          if (word) {
            const $a = $li.querySelector('a:nth-of-type(2)')
            if ($a) {
              const href = getFullLink($a, 'href')
              if (href) {
                return { word, href }
              }
            }
          }
        })
        .filter((x): x is CNKIDictItem => Boolean(x))
    }
  }

  // if (options.digests) {
  //   const $digests = $entries.find($e => Boolean($e.querySelector('img[src="images/04.gif"]')))
  //   if ($digests) {
  //     let more = ''

  //     $digests.querySelectorAll('td[align=right]').forEach($td => {
  //       if (($td.textContent || '').trim().endsWith('更多相关文摘')) {
  //         const $a = $td.querySelector('a')
  //         if ($a) {
  //           more = getFullLink($a, 'href')
  //         }
  //       }
  //       $td.remove()
  //     })

  //     result.digests = {
  //       more,
  //       content: [...$digests.querySelectorAll('p')]
  //         .map($p => getOuterHTML($p).replace(/&nbsp;/g, ''))
  //         .join('')
  //     }
  //   }
  // }

  if (// result.digests ||
    result.dict.length > 0 ||
    result.senbi.length > 0 ||
    result.seneng.length > 0
  ) {
    return { result }
  }

  return handleNoResult()
}

function extractSens ($entries: Element[], selector: string, sensid: string): CNKISensItem[] {
  const $sens = $entries.find($e => Boolean($e.querySelector(selector)))
  if (!$sens) { return [] }

  return [...$sens.querySelectorAll(`[id^=${sensid}]`)]
    .map($sens => {
      let more = ''

      $sens.querySelectorAll('td[align=right]').forEach($td => {
        if (($td.textContent || '').trim() === '更多') {
          const $a = $td.querySelector('a')
          if ($a) {
            more = getFullLink($a, 'href')
          }
        }
        $td.remove()
      })

      return {
        title: getText($sens.previousElementSibling!).trim(),
        more,
        sens: [...$sens.querySelectorAll('td')]
          .map($td => getInnerHTML($td).replace(/&nbsp;/g, '')),
      }
    })
}
