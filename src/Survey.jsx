import { useState } from 'react'
import { supabase } from './supabase.js'
import './Survey.css'

// ISS questions verbatim from Hodge (2003) p.48
// reversed: questions where scale runs 10→0
const ISS_QUESTIONS = [
  { id: 'iss_1', stem: 'In terms of the questions I have about life, my spirituality...', reversed: false, anchor0: 'answers no questions', anchor10: 'absolutely all my questions' },
  { id: 'iss_2', stem: 'Growing spiritually is...', reversed: true, anchor0: 'of no importance to me', anchor10: 'more important than anything else in my life' },
  { id: 'iss_3', stem: 'When I am faced with an important decision, my spirituality...', reversed: false, anchor0: 'plays absolutely no role', anchor10: 'is always the overriding consideration' },
  { id: 'iss_4', stem: 'Spirituality is...', reversed: true, anchor0: 'not part of my life', anchor10: 'the master motive of my life, directing every other aspect of my life' },
  { id: 'iss_5', stem: 'When I think of the things that help me to grow and mature as a person, my spirituality...', reversed: false, anchor0: 'has no effect on my personal growth', anchor10: 'is absolutely the most important factor in my personal growth' },
  { id: 'iss_6', stem: 'My spiritual beliefs affect...', reversed: true, anchor0: 'no aspect of my life', anchor10: 'absolutely every aspect of my life' },
]

// Grit questions verbatim from Duckworth et al. (2007) Table 1 — exact order
// Items 1-6: Consistency of Interests (reverse scored for final grit score)
// Items 7-12: Perseverance of Effort
const GRIT_QUESTIONS = [
  { id: 'grit_1', text: 'I often set a goal but later choose to pursue a different one.' },
  { id: 'grit_2', text: 'New ideas and new projects sometimes distract me from previous ones.' },
  { id: 'grit_3', text: 'I become interested in new pursuits every few months.' },
  { id: 'grit_4', text: 'My interests change from year to year.' },
  { id: 'grit_5', text: 'I have been obsessed with a certain idea or project for a short time but later lost interest.' },
  { id: 'grit_6', text: 'I have difficulty maintaining my focus on projects that take more than a few months to complete.' },
  { id: 'grit_7', text: 'I have achieved a goal that took years of work.' },
  { id: 'grit_8', text: 'I have overcome setbacks to conquer an important challenge.' },
  { id: 'grit_9', text: 'I finish whatever I begin.' },
  { id: 'grit_10', text: "Setbacks don't discourage me." },
  { id: 'grit_11', text: 'I am a hard worker.' },
  { id: 'grit_12', text: 'I am diligent.' },
]

const MARITAL_OPTIONS = [
  { value: '1', label: 'Now married' },
  { value: '2', label: 'Widowed' },
  { value: '3', label: 'Divorced' },
  { value: '4', label: 'Separated' },
  { value: '5', label: 'Never married' },
]

const GRIT_LABELS = ['Not at all like me', 'Not much like me', 'Somewhat like me', 'Mostly like me', 'Very much like me']

function computeScores(responses) {
  // ISS average — reversed items: displayed as 10→0, stored value is the displayed number
  // For reversed items, the visual scale is 10→0 so the stored number IS the correct raw value
  // We just average all 6 raw stored values
  const issVals = ISS_QUESTIONS.map(q => responses[q.id])
  const issAvg = issVals.reduce((a, b) => a + b, 0) / 6

  // Grit reverse score items 1-6 (Consistency of Interests): reverse = 6 - value
  const gritVals = GRIT_QUESTIONS.map((q, i) => {
    const raw = responses[q.id]
    return i < 6 ? (6 - raw) : raw
  })
  const gritAvg = gritVals.reduce((a, b) => a + b, 0) / 12

  return {
    iss_avg: parseFloat(issAvg.toFixed(2)),
    grit_avg: parseFloat(gritAvg.toFixed(2)),
  }
}

export default function Survey({ onComplete }) {
  const [responses, setResponses] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)

  const allQuestions = [
    'marital_status',
    ...ISS_QUESTIONS.map(q => q.id),
    ...GRIT_QUESTIONS.map(q => q.id),
  ]
  const answeredCount = allQuestions.filter(k => responses[k] !== undefined).length
  const totalCount = allQuestions.length
  const progress = Math.round((answeredCount / totalCount) * 100)

  const setResponse = (key, val) => setResponses(prev => ({ ...prev, [key]: val }))

  const getMissing = () => allQuestions.filter(k => responses[k] === undefined)

  const handleSubmit = async () => {
    setTouched(true)
    const missing = getMissing()
    if (missing.length > 0) {
      setError(`Please answer all questions before submitting. (${missing.length} remaining)`)
      // scroll to first unanswered
      const el = document.getElementById(missing[0])
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setError('')
    setLoading(true)

    const scores = computeScores(responses)

    const payload = {
      marital_status: parseInt(responses.marital_status),
      iss_1: responses.iss_1, iss_2: responses.iss_2, iss_3: responses.iss_3,
      iss_4: responses.iss_4, iss_5: responses.iss_5, iss_6: responses.iss_6,
      iss_avg: scores.iss_avg,
      grit_1: responses.grit_1, grit_2: responses.grit_2, grit_3: responses.grit_3,
      grit_4: responses.grit_4, grit_5: responses.grit_5, grit_6: responses.grit_6,
      grit_7: responses.grit_7, grit_8: responses.grit_8, grit_9: responses.grit_9,
      grit_10: responses.grit_10, grit_11: responses.grit_11, grit_12: responses.grit_12,
      grit_avg: scores.grit_avg,
      submitted_at: new Date().toISOString(),
    }

    const { error: sbError } = await supabase.from('responses').insert([payload])
    setLoading(false)

    if (sbError) {
      setError('There was an error submitting your response. Please try again.')
      console.error(sbError)
      return
    }
    onComplete()
  }

  return (
    <div className="survey-wrap">
      {/* Header */}
      <header className="survey-header">
        <div className="header-inner">
          <p className="survey-kicker">Graduate Research Survey · PSYC 515</p>
          <h1 className="survey-title">Spirituality and Its Relationship<br />to Internal Grit</h1>
          <div className="header-rule" />
          <p className="survey-subtitle">An anonymous academic survey</p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="progress-bar-wrap">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">{answeredCount} of {totalCount} answered</span>
      </div>

      <main className="survey-main">

        {/* Disclosure */}
        <section className="disclosure-block">
          <p className="disclosure-label">Disclosure</p>
          <p className="disclosure-text">
            I am asking you to complete this survey as part of the requirements for my statistics project
            in a graduate level psychology course. Your answers will remain completely anonymous. No personal
            information about you will be linked to this survey. Please do not put your name or any other
            identifying information on the survey. The results of this survey will be used only for educational
            purposes and will not be published or released to the public. You must be 18 years old or older
            to complete this survey.
          </p>
        </section>

        {/* Section 1: Demographic */}
        <section className="survey-section">
          <div className="section-header">
            <span className="section-number">01</span>
            <h2 className="section-title">Demographic Information</h2>
          </div>
          <p className="section-directions">Please select the one answer that best describes you.</p>

          <div id="marital_status" className={`question-block ${touched && responses.marital_status === undefined ? 'unanswered' : ''}`}>
            <p className="question-text">What is your current marital status?</p>
            <div className="marital-options">
              {MARITAL_OPTIONS.map(opt => (
                <label key={opt.value} className={`marital-option ${responses.marital_status === opt.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="marital_status"
                    value={opt.value}
                    checked={responses.marital_status === opt.value}
                    onChange={() => setResponse('marital_status', opt.value)}
                  />
                  <span className="radio-custom" />
                  <span className="option-label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Spirituality (ISS) */}
        <section className="survey-section">
          <div className="section-header">
            <span className="section-number">02</span>
            <h2 className="section-title">Spirituality</h2>
          </div>
          <p className="section-directions">
            For the following six questions, <em>spirituality is defined as one's relationship to God,
            or whatever you perceive to be Ultimate Transcendence.</em> The questions use a sentence
            completion format. An incomplete sentence fragment is provided, followed directly below by
            two phrases that are linked to a scale ranging from 0 to 10. The phrases complete the sentence
            fragment and anchor each end of the scale. The 0 to 10 range provides a continuum on which
            to reply, with 0 corresponding to absence or zero amount of the attribute and 10 corresponding
            to the maximum amount. Please select the number along the continuum that best reflects your
            initial feeling. <strong>Only provide one response per question.</strong>
          </p>

          {ISS_QUESTIONS.map((q, idx) => {
            const scale = q.reversed
              ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
              : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            const leftAnchor = q.reversed ? q.anchor10 : q.anchor0
            const rightAnchor = q.reversed ? q.anchor0 : q.anchor10

            return (
              <div
                key={q.id}
                id={q.id}
                className={`question-block iss-block ${touched && responses[q.id] === undefined ? 'unanswered' : ''}`}
              >
                <p className="question-number">Question {idx + 2}</p>
                <p className="question-stem">{q.stem}</p>
                <div className="iss-scale-wrap">
                  <div className="iss-scale-numbers">
                    {scale.map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`iss-num-btn ${responses[q.id] === n ? 'active' : ''}`}
                        onClick={() => setResponse(q.id, n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="iss-anchors">
                    <span className="anchor left">{leftAnchor}</span>
                    <span className="anchor right">{rightAnchor}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {/* Section 3: Grit */}
        <section className="survey-section">
          <div className="section-header">
            <span className="section-number">03</span>
            <h2 className="section-title">Personal Characteristics</h2>
          </div>
          <p className="section-directions">
            Please rate how much each of the following statements describes you.
            For each statement, select the number from 1 to 5 that best reflects your answer.
            <strong> Only provide one response per question.</strong>
          </p>
          <div className="grit-scale-legend">
            {GRIT_LABELS.map((l, i) => (
              <span key={i} className="grit-legend-item"><strong>{i + 1}</strong> — {l}</span>
            ))}
          </div>

          {GRIT_QUESTIONS.map((q, idx) => (
            <div
              key={q.id}
              id={q.id}
              className={`question-block grit-block ${touched && responses[q.id] === undefined ? 'unanswered' : ''}`}
            >
              <p className="question-text">
                <span className="grit-q-num">{idx + 8}.</span> {q.text}
              </p>
              <div className="grit-scale">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`grit-btn ${responses[q.id] === n ? 'active' : ''}`}
                    onClick={() => setResponse(q.id, n)}
                    title={GRIT_LABELS[n - 1]}
                  >
                    <span className="grit-num">{n}</span>
                    <span className="grit-hint">{GRIT_LABELS[n - 1]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Submit */}
        {error && <p className="submit-error">{error}</p>}

        <div className="submit-wrap">
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Survey'}
          </button>
          <p className="submit-note">Your response is completely anonymous and cannot be linked to you.</p>
        </div>

      </main>

      <footer className="survey-footer">
        <p>PSYC 515 · Graduate Research · Anonymous Survey</p>
      </footer>
    </div>
  )
}
