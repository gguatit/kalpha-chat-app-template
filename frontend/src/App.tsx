import React, { useEffect, useRef, useState } from 'react'

type Message = { role: string; content: string }

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '안녕하세요! 생년월일을 입력하거나 UI에서 설정하시면 띠 기반의 오늘의 운세를 알려드려요.' },
  ])
  const [text, setText] = useState('')
  const [birthdate, setBirthdate] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<string | null>(null)
  const [horoscope, setHoroscope] = useState(false)
  const [processing, setProcessing] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  function todayStr() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  useEffect(() => {
    setTargetDate(todayStr())
  }, [])

  async function send() {
    if (!text.trim()) return
    // add user message
    const userMsg = { role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setText('')
    setProcessing(true)

    // Build messages for API
    const chatHistory: Message[] = []
    // system prompt will be enforced by server
    if (birthdate) chatHistory.push({ role: 'user', content: `[생년월일] ${birthdate}` })
    if (targetDate) chatHistory.push({ role: 'user', content: `[운세날짜] ${targetDate}` })
    chatHistory.push(userMsg)
    if (horoscope) chatHistory.push({ role: 'user', content: `[운세|type:mixed]` })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      })
      if (!res.ok) throw new Error('API error')
      const text = await res.text()
      // Response might be SSE lines; attempt to parse
      let assistantContent = ''
      try {
        const parts = text.split('\n')
        for (const p of parts) {
          try {
            const j = JSON.parse(p)
            if (j.response) assistantContent += j.response
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        assistantContent = text
      }
      if (!assistantContent) assistantContent = '응답을 받지 못했습니다.'
      setMessages((m) => [...m, { role: 'assistant', content: assistantContent }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: '에러가 발생했습니다.' }])
    } finally {
      setProcessing(false)
    }
  }

  function onSendForm(e?: React.FormEvent) {
    e?.preventDefault()
    send()
  }

  return (
    <div className="chat-container">
      <header>
        <h1>오늘의 운세</h1>
      </header>
      <div ref={messagesRef} className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}-message`}>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <div className="message-input">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>생년월일:</label>
            <input type="date" value={birthdate ?? ''} onChange={(e) => setBirthdate(e.target.value || null)} />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginLeft: 8 }}>운세 날짜:</label>
            <input type="date" value={targetDate ?? ''} onChange={(e) => setTargetDate(e.target.value || null)} />
            <button onClick={() => { setBirthdate(null); }} style={{ background: '#9ca3af', color: 'white', borderRadius: 4, padding: '4px 8px' }}>지우기</button>
          </div>
          <form onSubmit={onSendForm} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요... (한국어로 입력해주세요)" rows={1} style={{ flex: 1 }} />
            <button type="submit" disabled={processing} id="send-button">전송</button>
          </form>
        </div>
      </div>
      {/* Mobile toolbar */}
      <div className="mobile-toolbar" style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
        <button className="mobile-toolbar-btn" onClick={() => { const el = document.querySelector('input[type=date]'); if (el) (el as HTMLInputElement).focus(); }}>생년월일</button>
        <button className="mobile-toolbar-btn" onClick={() => { setHoroscope((s) => !s); setMessages(m => [...m, { role: 'assistant', content: `운세 요청이 ${!horoscope ? '활성화' : '비활성화'}되었습니다.` }]); }}>운세</button>
        <button className="mobile-toolbar-btn" onClick={() => { const ta = document.querySelector('textarea'); if (ta) (ta as HTMLTextAreaElement).focus(); }}>입력</button>
      </div>
    </div>
  )
}
