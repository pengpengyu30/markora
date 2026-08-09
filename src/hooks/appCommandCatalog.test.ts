import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { APP_COMMAND_IDS, getAppCommandMenuSections } from './appCommandCatalog'

describe('appCommandCatalog', () => {
  it('localizes custom desktop menu labels', () => {
    const viewMenu = getAppCommandMenuSections(createTranslator('zh-CN')).find(section => section.label === '视图')

    expect(viewMenu?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        commandId: APP_COMMAND_IDS.viewZoomReset,
        label: '实际大小',
      }),
    ]))
  })
})
