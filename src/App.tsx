import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  const handleIncrement = () => {
    console.log('Incrementing count from', count, 'to', count + 1)
    setCount(count + 1)
  }

  const handleDecrement = () => {
    console.log('Decrementing count from', count, 'to', count - 1)
    setCount(count - 1)
  }

  console.log('App rendered with count:', count)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Bun 1.3.1 Boilerplate
      </h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
        React 19 + TypeScript + Native Bun Server
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={handleDecrement}
            style={{
              fontSize: '2rem',
              padding: '0.5rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            -
          </button>
          <span style={{ fontSize: '3rem', fontWeight: 'bold', minWidth: '3rem', textAlign: 'center' }}>
            {count}
          </span>
          <button
            onClick={handleIncrement}
            style={{
              fontSize: '2rem',
              padding: '0.5rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            +
          </button>
        </div>

        <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>✨ Features:</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>⚡️ Lightning-fast Bun 1.3.1 runtime</li>
            <li>🔥 Native Bun dev server with hot reload</li>
            <li>🖥️ <strong>console: true</strong> - Frontend logs to backend!</li>
            <li>⚛️ React 19 with hooks</li>
            <li>🎨 TypeScript with strict mode</li>
            <li>📦 Native Bun bundler</li>
          </ul>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
            💡 Check your terminal - button clicks are logged there!
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
