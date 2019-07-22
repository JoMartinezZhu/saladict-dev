/**
 * Abstracted layer for storing large amount of word records.
 */

import { message } from '@/_helpers/browser-api'
import { SelectionInfo } from '@/_helpers/selection'
import {
  MsgType,
  MsgIsInNotebook,
  MsgSaveWord,
  MsgDeleteWords,
  MsgGetWordsByText,
  MsgGetWords,
  MsgGetWordsResponse,
} from '@/typings/message'

export interface Word {
  /** primary key, milliseconds elapsed since the UNIX epoch */
  date: number
  /** word text */
  text: string
  /** the sentence where the text string is located */
  context: string
  /** page title */
  title: string
  /** page url */
  url: string
  /** favicon url */
  favicon: string
  /** translation */
  trans: string
  /** custom note */
  note: string
}

export type Area = 'notebook' | 'history'

export function newWord (word?: Partial<Word>): Word {
  return word
    ? {
      date: word.date || Date.now(),
      text: word.text || '',
      context: word.context || '',
      title: word.title || '',
      url: word.url || '',
      favicon: word.favicon || '',
      trans: word.trans || '',
      note: word.note || '',
    }
    : {
      date: Date.now(),
      text: '',
      context: '',
      title: '',
      url: '',
      favicon: '',
      trans: '',
      note: '',
    }
}

export function isInNotebook (info: SelectionInfo): Promise<boolean> {
  return message.send<MsgIsInNotebook>({ type: MsgType.IsInNotebook, info })
    .catch(logError(false))
}

export async function saveWord (area: Area, info: SelectionInfo): Promise<void> {
  await message.send<MsgSaveWord>({ type: MsgType.SaveWord, area, info })
}

export async function deleteWords (area: Area, dates?: number[]): Promise<void> {
  await message.send({ type: MsgType.SyncServiceDownload })
  await message.send<MsgDeleteWords>({ type: MsgType.DeleteWords, area, dates })
}

export function getWordsByText (area: Area, text: string): Promise<Word[]> {
  return message.send<MsgGetWordsByText>({ type: MsgType.GetWordsByText, area, text })
}

export function getWords (
  area: Area,
  config: {
    itemsPerPage?: number,
    pageNum?: number,
    filters: { [field: string]: string[] | undefined },
    sortField?: string,
    sortOrder?: 'ascend' | 'descend' | false,
    searchText?: string,
  }
): Promise<MsgGetWordsResponse> {
  return message.send<MsgGetWords, MsgGetWordsResponse>({
    type: MsgType.GetWords,
    area,
    ...config,
  })
}

function logError<T = any> (valPassThrough: T): (x: any) => T {
  return err => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(err)
    }
    return valPassThrough
  }
}
