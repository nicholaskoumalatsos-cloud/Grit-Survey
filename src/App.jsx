import { useState, useEffect } from 'react'
import Survey from './Survey.jsx'
import Admin from './Admin.jsx'
import ThankYou from './ThankYou.jsx'

export default function App() {
  const [page, setPage] = useState('survey')

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/admin') setPage('admin')
    else if (path === '/thankyou') setPage('thankyou')
    else setPage('survey')
  }, [])

  const navigate = (to) => {
    window.history.pushState({}, '', '/' + (to === 'survey' ? '' : to))
    setPage(to)
  }

  if (page === 'admin') return <Admin />
  if (page === 'thankyou') return <ThankYou />
  return <Survey onComplete={() => navigate('thankyou')} />
}
