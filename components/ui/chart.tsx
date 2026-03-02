'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

type IndicatorStyle = 'line' | 'dot' | 'dashed'

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip>

function resolveTooltipLabel(
  config: ChartConfig,
  payload: TooltipProps['payload'],
  hideLabel: boolean,
  label: TooltipProps['label'],
  labelKey: string | undefined,
  labelFormatter: TooltipProps['labelFormatter'],
  labelClassName: string | undefined,
): React.ReactNode {
  if (hideLabel || !payload?.length) {
    return null
  }

  const [item] = payload
  const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
  const itemConfig = getPayloadConfigFromPayload(config, item, key)
  const value =
    !labelKey && typeof label === 'string'
      ? config[label as keyof typeof config]?.label || label
      : itemConfig?.label

  if (labelFormatter) {
    return (
      <div className={cn('font-medium', labelClassName)}>
        {labelFormatter(value, payload)}
      </div>
    )
  }

  if (!value) {
    return null
  }

  return <div className={cn('font-medium', labelClassName)}>{value}</div>
}

type TooltipIndicatorProps = {
  readonly itemConfig: ChartConfig[string] | undefined
  readonly hideIndicator: boolean
  readonly indicator: IndicatorStyle
  readonly indicatorColor: string | undefined
  readonly nestLabel: boolean
}

function TooltipIndicator({
  itemConfig,
  hideIndicator,
  indicator,
  indicatorColor,
  nestLabel,
}: TooltipIndicatorProps) {
  if (itemConfig?.icon) {
    return <itemConfig.icon />
  }

  if (hideIndicator) {
    return null
  }

  return (
    <div
      className={cn(
        'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
        {
          'h-2.5 w-2.5': indicator === 'dot',
          'w-1': indicator === 'line',
          'w-0 border-[1.5px] border-dashed bg-transparent':
            indicator === 'dashed',
          'my-0.5': nestLabel && indicator === 'dashed',
        },
      )}
      style={
        {
          '--color-bg': indicatorColor,
          '--color-border': indicatorColor,
        } as React.CSSProperties
      }
    />
  )
}

function TooltipPayloadList({
  payload,
  config,
  formatter,
  indicator,
  color,
  nameKey,
  nestLabel,
  hideIndicator,
  tooltipLabel,
}: {
  readonly payload: NonNullable<TooltipProps['payload']>
  readonly config: ChartConfig
  readonly formatter: TooltipProps['formatter']
  readonly indicator: IndicatorStyle
  readonly color: string | undefined
  readonly nameKey: string | undefined
  readonly nestLabel: boolean
  readonly hideIndicator: boolean
  readonly tooltipLabel: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      {payload.map((item, index) => {
        const key = `${nameKey || item.name || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const indicatorColor = color || item.payload.fill || item.color

        return (
          <div
            key={item.dataKey}
            className={cn(
              '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
              indicator === 'dot' && 'items-center',
            )}
          >
            {formatter && item?.value !== undefined && item.name ? (
              formatter(item.value, item.name, item, index, item.payload)
            ) : (
              <>
                <TooltipIndicator
                  itemConfig={itemConfig}
                  hideIndicator={hideIndicator}
                  indicator={indicator}
                  indicatorColor={indicatorColor}
                  nestLabel={nestLabel}
                />
                <div
                  className={cn(
                    'flex flex-1 justify-between leading-none',
                    nestLabel ? 'items-end' : 'items-center',
                  )}
                >
                  <div className="grid gap-1.5">
                    {nestLabel ? tooltipLabel : null}
                    <span className="text-muted-foreground">
                      {itemConfig?.label || item.name}
                    </span>
                  </div>
                  {item.value && (
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: IndicatorStyle
    nameKey?: string
    labelKey?: string
  }) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(
    () => resolveTooltipLabel(config, payload, hideLabel, label, labelKey, labelFormatter, labelClassName),
    [config, payload, hideLabel, label, labelKey, labelFormatter, labelClassName]
  )

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== 'dot'

  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <TooltipPayloadList
        payload={payload}
        config={config}
        formatter={formatter}
        indicator={indicator}
        color={color}
        nameKey={nameKey}
        nestLabel={nestLabel}
        hideIndicator={hideIndicator}
        tooltipLabel={tooltipLabel}
      />
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> &
  Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
    hideIcon?: boolean
    nameKey?: string
  }) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)

        return (
          <div
            key={item.value}
            className={
              '[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3'
            }
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

function extractNestedPayload(payload: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!('payload' in payload)) {
    return undefined
  }

  const nested = payload.payload
  if (typeof nested !== 'object' || nested === null) {
    return undefined
  }

  return nested as Record<string, unknown>
}

function resolveConfigLabelKey(
  payload: Record<string, unknown>,
  payloadPayload: Record<string, unknown> | undefined,
  key: string,
): string {
  if (key in payload && typeof payload[key] === 'string') {
    return payload[key] as string
  }

  if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string') {
    return payloadPayload[key] as string
  }

  return key
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  const payloadRecord = payload as Record<string, unknown>
  const nestedPayload = extractNestedPayload(payloadRecord)
  const configLabelKey = resolveConfigLabelKey(payloadRecord, nestedPayload, key)

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
