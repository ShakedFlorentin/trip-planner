import { Tabs, TabsIndicator, TabsList, TabsTab } from '@ui-sdk/react/tabs'

/** Underlined tabs pinned under the top bar (Bookings, Places): ui-sdk Tabs with its sliding indicator. */
export default function UnderlineTabs(props: { label: string; tabs: [key: string, label: string][]; value: string; onChange: (key: string) => void }) {
  return (
    <Tabs className="tabs-root" value={props.value} onValueChange={(v) => v && props.onChange(v)}>
      <TabsList className="ul-tabs" aria-label={props.label}>
        {props.tabs.map(([k, label]) => (
          <TabsTab key={k} value={k} className="ul-tab">
            {label}
          </TabsTab>
        ))}
        <TabsIndicator className="ul-indicator" />
      </TabsList>
    </Tabs>
  )
}
