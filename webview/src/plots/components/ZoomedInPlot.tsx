import React, { useEffect, useRef } from 'react'
import VegaLite, { VegaLiteProps } from 'react-vega/lib/VegaLite'
import { Config } from 'vega-lite'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'
import {
  makePlotZoomOnWheel,
  reverseOfLegendSuppressionUpdate
} from 'dvc/src/plots/vega/util'
import { TemplateVegaLite } from './templatePlots/TemplateVegaLite'
import styles from './styles.module.scss'
import { getThemeValue, ThemeProperty } from '../../util/styles'
import {
  exportPlotDataAsCsv,
  exportPlotDataAsJson,
  exportPlotDataAsTsv
} from '../util/messages'

type ZoomedInPlotProps = {
  id: string
  props: VegaLiteProps
  isTemplatePlot: boolean
  openActionsMenu?: boolean
}

const appendActionToVega = (
  type: string,
  vegaActions: HTMLDivElement,
  onClick: () => void
) => {
  const rawDataAction = document.createElement('a')
  rawDataAction.textContent = `Save as ${type}`
  rawDataAction.addEventListener('click', () => {
    onClick()
  })
  rawDataAction.classList.add(styles.vegaCustomAction)
  vegaActions.append(rawDataAction)
}

export const ZoomedInPlot: React.FC<ZoomedInPlotProps> = ({
  id,
  props,
  isTemplatePlot,
  openActionsMenu
}: ZoomedInPlotProps) => {
  const isCustomPlot = !isTemplatePlot
  const hasSmoothing =
    isTemplatePlot &&
    (props.spec as { params?: { name: string }[] }).params?.[0]?.name ===
      'smooth'

  const zoomedInPlotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const modalOpenClass = 'modalOpen'
    document.body.classList.add(modalOpenClass)

    return () => {
      document.body.classList.remove(modalOpenClass)
    }
  }, [])

  const onNewView = () => {
    const actions: HTMLDivElement | null | undefined =
      zoomedInPlotRef.current?.querySelector('.vega-actions')
    if (!actions) {
      return
    }

    appendActionToVega('JSON', actions, () => exportPlotDataAsJson(id))
    appendActionToVega('CSV', actions, () => exportPlotDataAsCsv(id))
    appendActionToVega('TSV', actions, () => exportPlotDataAsTsv(id))

    if (openActionsMenu) {
      setTimeout(() => {
        const actionsDetails = actions.parentElement as HTMLDetailsElement
        if (actionsDetails) {
          actionsDetails.open = true
        }
      }, 500)
    }
  }

  const specUpdate = merge(
    reverseOfLegendSuppressionUpdate(),
    makePlotZoomOnWheel(isCustomPlot, hasSmoothing)
  )

  const vegaLiteProps = {
    ...merge({ ...cloneDeep(props) }, specUpdate),
    actions: {
      compiled: false,
      editor: false,
      export: true,
      source: false
    },
    config: {
      ...(props.config as Config),
      background: getThemeValue(ThemeProperty.MENU_BACKGROUND)
    }
  }

  return (
    <div
      className={styles.zoomedInPlot}
      data-testid="zoomed-in-plot"
      ref={zoomedInPlotRef}
    >
      {isTemplatePlot ? (
        <TemplateVegaLite
          id={id}
          vegaLiteProps={vegaLiteProps}
          onNewView={onNewView}
        />
      ) : (
        <VegaLite {...vegaLiteProps} onNewView={onNewView} />
      )}
    </div>
  )
}
