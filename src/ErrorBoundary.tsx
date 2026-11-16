import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from './i18n'
import { track } from './track'

/**
 * The last safety net: a render error anywhere below would otherwise blank the whole app (React unmounts the tree).
 * Says so in plain words and offers a reload; changes not sent yet stay in the outbox (localStorage). Only the error's
 * class is counted, never its message, which can carry what someone typed.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    try {
      track('render_error', { kind: error instanceof Error ? error.name.slice(0, 40) : typeof error })
    } catch {
      // counting must never make it worse
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        role="alert"
        // laid out here, not in a stylesheet: this screen must look right even if the fault is in the styles' own logic
        style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '24px 28px', textAlign: 'center', boxSizing: 'border-box' }}
      >
        <h2>{t('משהו השתבש')}</h2>
        <p>{t('האפליקציה נתקלה בתקלה. טעינה מחדש בדרך כלל פותרת את זה, ושינויים שעוד לא נשלחו נשמרים בטלפון.')}</p>
        <button className="primary" style={{ maxWidth: 320 }} onClick={() => location.reload()}>
          {t('טעינה מחדש')}
        </button>
      </div>
    )
  }
}
