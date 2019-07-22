import React from 'react'
import { TranslationFunction } from 'i18next'
import { CustomContextItem } from '@/app-config/context-menus'

import { FormComponentProps } from 'antd/lib/form'
import { Form, Input, Modal } from 'antd'

export interface EditModalItem {
  name: string
  url: string
  id: string
}

export interface EditModalProps extends FormComponentProps {
  t: TranslationFunction
  title: string
  item: EditModalItem | null
  onClose: (item?: EditModalItem) => void
}

export class EditModal extends React.Component<EditModalProps> {
  render () {
    const { title, onClose, item, t } = this.props
    const { getFieldDecorator, getFieldsValue } = this.props.form

    return (
      <Modal
        visible={!!item}
        title={title}
        destroyOnClose
        onOk={() => onClose({
          ...getFieldsValue() as CustomContextItem,
          id: item!.id
        })}
        onCancel={() => onClose()}
      >
        <Form>
          <Form.Item
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            label={t('common:name')}
            style={{ marginBottom: 0 }}
          >{
            getFieldDecorator('name', {
              initialValue: item ? item.name : '',
            })(
              <Input autoFocus />
            )
          }</Form.Item>
        </Form>
        <Form>
          <Form.Item
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            label='URL'
            style={{ marginBottom: 0 }}
          >{
            getFieldDecorator('url', {
              initialValue: item ? item.url : '',
            })(
              <Input />
            )
          }</Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(EditModal)
