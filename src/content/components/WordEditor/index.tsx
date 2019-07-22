import React from 'react'
import { translate } from 'react-i18next'
import { TranslationFunction } from 'i18next'
import { SelectionInfo, getDefaultSelectionInfo } from '@/_helpers/selection'
import { Word, deleteWords } from '@/_helpers/record-manager'
import WordCards from '../WordCards'
import { message } from '@/_helpers/browser-api'
import { MsgType, MsgOpenUrl } from '@/typings/message'
import { translateCtx } from '@/_helpers/translateCtx'
import { DictID } from '@/app-config'

const isSaladictInternalPage = !!window.__SALADICT_INTERNAL_PAGE__

export interface WordEditorDispatchers {
  saveToNotebook: (info: SelectionInfo) => any
  getWordsByText: (text: string) => Promise<Word[]>
  closeDictPanel: () => any
  closeModal: () => any
  updateEditorWord: (word: SelectionInfo | null) => any
}

export interface WordEditorProps extends WordEditorDispatchers {
  dictPanelWidth: number
  editorWord: SelectionInfo
  ctxTrans: { [index in DictID]: boolean }
}

interface WordEditorState {
  relatedWords: Word[]
  width: number
  leftOffset: number
  isChanged: boolean
}

export class WordEditor extends React.PureComponent<WordEditorProps & { t: TranslationFunction }, WordEditorState> {
  constructor (props: WordEditorProps & { t: TranslationFunction }) {
    super(props)

    const winWidth = window.innerWidth
    const width = Math.min(800, Math.max(400, winWidth - props.dictPanelWidth - 100))

    let leftOffset = 0
    const emptySpace = (winWidth - width) / 2
    if (emptySpace < props.dictPanelWidth + 40) {
      const shouldMove = props.dictPanelWidth + 40 - emptySpace
      if (emptySpace > shouldMove) {
        leftOffset = shouldMove
      } else {
        this.props.closeDictPanel()
      }
    }

    this.state = {
      relatedWords: [],
      width,
      leftOffset,
      isChanged: false,
    }
  }

  formChanged = ({ currentTarget }) => {
    this.props.updateEditorWord({ ...this.props.editorWord, [currentTarget.name]: currentTarget.value })
    if (!this.state.isChanged) {
      this.setState({ isChanged: true })
    }
  }

  saveToNotebook = () => {
    this.props.saveToNotebook(this.props.editorWord)
      .then(() => this.props.closeModal())
  }

  closeModal = () => {
    if (!this.state.isChanged || confirm(this.props.t('wordEditorCloseConfirm'))) {
      this.props.closeModal()
    }
  }

  openOptions = () => {
    message.send<MsgOpenUrl>({
      type: MsgType.OpenURL,
      url: 'options.html?menuselected=Notebook',
      self: true,
    })
  }

  getRelatedWords = () => {
    const word = this.props.editorWord
    if (!word.text) { return }
    this.props.getWordsByText(word.text)
      .then(words => {
        if (word['date']) {
          words = words.filter(({ date }) => date !== word['date'])
        }
        this.setState({ relatedWords: words })
      })
  }

  deleteCard = (word: Word) => {
    if (window.confirm(this.props.t('wordEditorDeleteConfirm'))) {
      deleteWords('notebook', [word.date])
        .then(this.getRelatedWords)
    }
  }

  translateCtx = () => {
    const word = this.props.editorWord
    translateCtx(word.context || word.text, this.props.ctxTrans)
      .then(trans => {
        if (trans) {
          // incase user has inputed other words
          const word = this.props.editorWord
          this.props.updateEditorWord({
            ...word,
            trans: word.trans
              ? word.trans + '\n\n' + trans
              : trans
          })
        }
      })
      .catch(() => {/* nothing */})
  }

  componentDidMount () {
    this.getRelatedWords()
    if (!this.props.editorWord.trans) {
      this.translateCtx()
    }
  }

  render () {
    const {
      t,
    } = this.props

    const editorWord = this.props.editorWord || getDefaultSelectionInfo()

    const {
      relatedWords,
      width,
      leftOffset,
    } = this.state

    return (
      <div className='wordEditor-Container' style={{ width, transform: `translateX(${leftOffset}px)` }}>
        <header className='wordEditor-Header'>
          <h1 className='wordEditor-Title'>{t('wordEditorTitle')}</h1>
          <button type='button'
            className='wordEditor-Note_BtnClose'
            onClick={this.closeModal}
          >×</button>
        </header>
        <div className='wordEditor-Main'>
          <form className='wordEditor-Note'>
            <label htmlFor='wordEditor-Note_Word'>{t('wordEditorNoteWord')}</label>
            <input type='text'
              name='text'
              id='wordEditor-Note_Word'
              value={editorWord.text}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_Trans'>
              {t('wordEditorNoteTrans')}
              <a
                href='https://github.com/crimx/ext-saladict/wiki/Q&A#%E9%97%AE%E6%B7%BB%E5%8A%A0%E7%94%9F%E8%AF%8D%E5%8F%AF%E4%B8%8D%E5%8F%AF%E4%BB%A5%E5%8A%A0%E5%85%A5%E5%8D%95%E8%AF%8D%E7%BF%BB%E8%AF%91%E8%80%8C%E4%B8%8D%E6%98%AF%E7%BF%BB%E8%AF%91%E6%95%B4%E5%8F%A5%E4%B8%8A%E4%B8%8B%E6%96%87'
                target='_blank'
                rel='nofollow noopener noreferrer'
              > Why?</a>
            </label>
            <textarea rows={5}
              name='trans'
              id='wordEditor-Note_Trans'
              value={editorWord.trans}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_Note'>{t('wordEditorNoteNote')}</label>
            <textarea rows={5}
              name='note'
              id='wordEditor-Note_Note'
              value={editorWord.note}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_Context'>{t('wordEditorNoteContext')}</label>
            <textarea rows={5}
              name='context'
              id='wordEditor-Note_Context'
              value={editorWord.context}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_SrcTitle'>{t('wordEditorNoteSrcTitle')}</label>
            <input type='text'
              name='title'
              id='wordEditor-Note_SrcTitle'
              value={editorWord.title}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_SrcLink'>{t('wordEditorNoteSrcLink')}</label>
            <input type='text'
              name='url'
              id='wordEditor-Note_SrcLink'
              value={editorWord.url}
              onChange={this.formChanged}
            />
            <label htmlFor='wordEditor-Note_SrcFavicon'>
              {t('wordEditorNoteSrcFavicon')}
              {editorWord.favicon
                ? <img
                    className='wordEditor-Note_SrcFavicon'
                    src={editorWord.favicon}
                    alt={t('wordEditorNoteSrcTitle')}
                  />
                : null}
            </label>
            <input type='text'
              name='favicon'
              id='wordEditor-Note_SrcFavicon'
              value={editorWord.favicon}
              onChange={this.formChanged}
            />
          </form>
          {relatedWords.length > 0 && <WordCards words={relatedWords} deleteCard={this.deleteCard} /> }
        </div>
        <footer className='wordEditor-Footer'>
          <button type='button'
            className='wordEditor-Note_Btn'
            onClick={this.translateCtx}
          >{t('transContext')}</button>
          {!isSaladictInternalPage &&
            <button type='button'
              className='wordEditor-Note_Btn'
              onClick={this.openOptions}
            >{t('neverShow')}</button>
          }
          <button type='button'
            className='wordEditor-Note_Btn'
            onClick={this.closeModal}
          >{t('cancel')}</button>
          <button type='button'
            className='wordEditor-Note_BtnSave'
            onClick={this.saveToNotebook}
          >{t('save')}</button>
        </footer>
      </div>
    )
  }
}

export default translate()(WordEditor)
