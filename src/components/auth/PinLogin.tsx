'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Lock, AlertCircle } from 'lucide-react'

export function PinLogin() {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')

    // Move to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('')
      submitPin(fullPin)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pastedData.length === 4) {
      const newPin = pastedData.split('')
      setPin(newPin)
      submitPin(pastedData)
    }
  }

  const submitPin = async (pinCode: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode }),
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        setError('Felaktig PIN-kod')
        setPin(['', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Något gick fel. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 font-mono">
              Offertanalys
            </h1>
            <p className="text-slate-400 mt-2">
              Installationsbolaget Stockholm AB
            </p>
          </div>

          {/* PIN Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 text-center mb-4">
              Ange PIN-kod
            </label>
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-14 h-16 text-center text-2xl font-mono bg-[#1e2a36] border-2 border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center mb-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center text-slate-400 text-sm">
              Verifierar...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
