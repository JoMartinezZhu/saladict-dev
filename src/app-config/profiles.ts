import { DeepReadonly } from '@/typings/helpers'
import { genUniqueKey } from '@/_helpers/uniqueKey'
import { getALlDicts } from './dicts'

export type MtaAutoUnfold = '' | 'once' | 'always' | 'popup'

export type ProfileMutable = ReturnType<typeof _getDefaultProfile>
export type Profile = DeepReadonly<ProfileMutable>

export interface ProfileID {
  id: string
  name: string
}

export type ProfileIDList = Array<ProfileID>

export const getDefaultProfile: (id?: string) => Profile = _getDefaultProfile

export default getDefaultProfile

export function _getDefaultProfile (id?: string) {
  return {
    id: id || genUniqueKey(),

    /** auto unfold multiline textarea search box */
    mtaAutoUnfold: '' as MtaAutoUnfold,

    /** show waveform control panel */
    waveform: false,

    dicts: {
      /** default selected dictionaries */
      selected: [
        'bing',
        'cobuild',
        'cambridge',
        'youdao',
        'urban',
        'vocabulary',
        'google',
        'sogou',
        'zdic',
        'guoyu',
        'liangan',
        'googledict',
      ] as Array<keyof ReturnType<typeof getALlDicts>>,
      // settings of each dict will be auto-generated
      all: getALlDicts()
    },
  }
}

export function getDefaultProfileID (id?: string): ProfileID {
  return {
    id: id || genUniqueKey(),
    name: '%%_default_%%',
  }
}

export interface ProfileStorage {
  idItem: ProfileID
  profile: Profile
}

export function genProfilesStorage (): {
  profileIDList: ProfileIDList
  profiles: Profile[]
} {
  const defaultID = getDefaultProfileID()
  const defaultProfile = getDefaultProfile(defaultID.id)
  const sentenceStorage = sentence()
  const translationStorage = translation()
  const scholarStorage = scholar()

  return {
    profileIDList: [
      defaultID,
      sentenceStorage.idItem,
      translationStorage.idItem,
      scholarStorage.idItem,
    ],
    profiles: [
      defaultProfile,
      sentenceStorage.profile,
      translationStorage.profile,
      scholarStorage.profile,
    ]
  }
}

export function sentence (): ProfileStorage {
  const idItem = getDefaultProfileID()
  idItem.name = '%%_sentence_%%'

  const profile = getDefaultProfile(idItem.id) as ProfileMutable
  profile.dicts.selected = ['jukuu', 'bing', 'cnki', 'eudic', 'cobuild', 'cambridge', 'longman', 'macmillan']

  const allDict = profile.dicts.all
  allDict.bing.options.tense = false
  allDict.bing.options.phsym = false
  allDict.bing.options.cdef = false
  allDict.bing.options.related = false
  allDict.bing.options.sentence = 9999
  allDict.cnki.options.dict = false
  allDict.eudic.options.resultnum = 9999
  allDict.macmillan.options.related = false
  allDict.longman.options.wordfams = false
  allDict.longman.options.collocations = false
  allDict.longman.options.grammar = false
  allDict.longman.options.thesaurus = false
  allDict.longman.options.examples = true
  allDict.longman.options.bussinessFirst = false
  allDict.longman.options.related = false

  return { idItem, profile }
}

export function scholar (): ProfileStorage {
  const idItem = getDefaultProfileID()
  idItem.name = '%%_scholar_%%'

  const profile = getDefaultProfile(idItem.id) as ProfileMutable
  profile.dicts.selected = ['googledict', 'cambridge', 'cobuild', 'etymonline', 'cnki', 'macmillan', 'oald', 'websterlearner', 'google', 'sogou', 'zdic', 'guoyu', 'liangan']

  const allDict = profile.dicts.all
  allDict.macmillan.defaultUnfold = {
    english: false,
    chinese: false,
    japanese: false,
    korean: false,
    french: false,
    spanish: false,
    deutsch: false,
    others: false,
  }
  allDict.oald.defaultUnfold = {
    english: false,
    chinese: false,
    japanese: false,
    korean: false,
    french: false,
    spanish: false,
    deutsch: false,
    others: false,
  }
  allDict.websterlearner.defaultUnfold = {
    english: false,
    chinese: false,
    japanese: false,
    korean: false,
    french: false,
    spanish: false,
    deutsch: false,
    others: false,
  }
  allDict.google.selectionWC.min = 5
  allDict.sogou.selectionWC.min = 5

  return { idItem, profile }
}

export function translation (): ProfileStorage {
  const idItem = getDefaultProfileID()
  idItem.name = '%%_translation_%%'

  const profile = getDefaultProfile(idItem.id) as ProfileMutable
  profile.dicts.selected = ['google', 'tencent', 'sogou', 'baidu', 'caiyun', 'youdao', 'zdic', 'guoyu', 'liangan']
  profile.mtaAutoUnfold = 'always'

  return { idItem, profile }
}
