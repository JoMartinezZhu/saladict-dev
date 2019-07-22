import { message } from '@/_helpers/browser-api'
import { MsgSelection, MsgType } from '@/typings/message'
import { getDefaultSelectionInfo } from '@/_helpers/selection'
import { StoreState, DispatcherThunk } from './index'
import { newSelection as newSelectionWidget } from './widget'

/*-----------------------------------------------*\
    Action Type
\*-----------------------------------------------*/

export const enum ActionType {
  NEW_SELECTION = 'selection/NEW_SELECTION'
}

/*-----------------------------------------------*\
    Payload
\*-----------------------------------------------*/

interface SelectionPayload {
  [ActionType.NEW_SELECTION]: MsgSelection
}

/*-----------------------------------------------*\
    State
\*-----------------------------------------------*/

export type SelectionState = {
  readonly selection: MsgSelection
}

export const initState: SelectionState = {
  selection: {
    type: MsgType.Selection,
    selectionInfo: getDefaultSelectionInfo(),
    mouseX: 0,
    mouseY: 0,
    self: false,
    dbClick: false,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    instant: false,
    force: false,
  }
}

/*-----------------------------------------------*\
    Reducer Object
\*-----------------------------------------------*/

type SelectionReducer = {
  [k in ActionType]: (state: StoreState, payload: SelectionPayload[k]) => StoreState
}

export const reducer: SelectionReducer = {
  [ActionType.NEW_SELECTION] (state, selection) {
    return { ...state, selection }
  }
}

export default reducer

/*-----------------------------------------------*\
    Action Creators
\*-----------------------------------------------*/

interface Action<T extends ActionType> {
  type: T,
  payload?: SelectionPayload[T]
}

/** When new selection is made */
export function newSelection (selection: MsgSelection): Action<ActionType.NEW_SELECTION> {
  return { type: ActionType.NEW_SELECTION, payload: selection }
}

/*-----------------------------------------------*\
    Side Effects
\*-----------------------------------------------*/

/** Listen to selection change and update selection */
export function startUpAction (): DispatcherThunk {
  return dispatch => {
    message.self.addListener<MsgSelection>(
      MsgType.Selection,
      message => {
        dispatch(newSelection(message))
        dispatch(newSelectionWidget())
      },
    )
  }
}
