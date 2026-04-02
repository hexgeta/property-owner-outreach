import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface QuizConfig {
  id: string
  welcome_title: string
  welcome_subtitle: string
  completion_message: string
  brand_color: string
  logo_url: string
}

interface Step {
  id: string
  step_order: number
  question: string
  description: string
  field_key: string
  field_type: string
  options: { value: string; label: string; icon?: string }[]
  is_required: boolean
  placeholder: string
  min_value: number
  max_value: number
  step_unit: string
}

export default function QuizPage() {
  const router = useRouter()
  const { slug } = router.query

  const [quiz, setQuiz] = useState<QuizConfig | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(-1) // -1 = welcome, steps.length = contact info, steps.length+1 = done
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '', telegram_username: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    fetch(`/api/quiz/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.quiz) {
          setQuiz(data.quiz)
          setSteps(data.steps || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const totalSteps = steps.length + 1 // +1 for contact info step
  const progress = currentStep < 0 ? 0 : Math.min(((currentStep + 1) / (totalSteps + 1)) * 100, 100)

  const setAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const toggleMultiSelect = (key: string, value: string) => {
    setAnswers(prev => {
      const current = prev[key] || []
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current, value],
      }
    })
  }

  const canProceed = () => {
    if (currentStep < 0) return true // welcome screen
    if (currentStep >= steps.length) return !!contactInfo.name // contact step needs name
    const step = steps[currentStep]
    if (!step.is_required) return true
    const answer = answers[step.field_key]
    if (step.field_type === 'multi_select') return answer?.length > 0
    return !!answer
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    // Map answers to structured fields
    const body: any = {
      name: contactInfo.name,
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      telegram_username: contactInfo.telegram_username || undefined,
      property_types: answers.property_types || answers.property_type ? [answers.property_type] : [],
      districts: answers.districts || answers.district ? [answers.district] : [],
      municipalities: answers.municipalities || [],
      min_budget: answers.min_budget || answers.budget_min,
      max_budget: answers.max_budget || answers.budget_max,
      min_area_m2: answers.min_area_m2 || answers.area_min,
      max_area_m2: answers.max_area_m2 || answers.area_max,
      num_bedrooms_min: answers.num_bedrooms_min || answers.bedrooms,
      condition_preferences: answers.condition_preferences || answers.condition ? [answers.condition] : [],
      features: answers.features || [],
      timeline: answers.timeline,
      quiz_answers: answers,
    }

    const res = await fetch(`/api/quiz/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setCurrentStep(steps.length + 1) // go to completion screen
    } else {
      const json = await res.json()
      setError(json.error || 'Submission failed')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">A carregar...</div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Quiz nao encontrado</div>
      </div>
    )
  }

  const brandColor = quiz.brand_color || '#ffffff'

  return (
    <>
      <Head>
        <title>{quiz.welcome_title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Progress bar */}
        {currentStep >= 0 && currentStep <= steps.length && (
          <div className="w-full h-1 bg-zinc-800">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: brandColor }}
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">

            {/* ── WELCOME SCREEN ── */}
            {currentStep === -1 && (
              <div className="text-center space-y-6 animate-fadeIn">
                {quiz.logo_url && (
                  <img src={quiz.logo_url} alt="" className="h-16 mx-auto mb-4" />
                )}
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  {quiz.welcome_title}
                </h1>
                <p className="text-lg text-gray-400 max-w-md mx-auto">
                  {quiz.welcome_subtitle}
                </p>
                <Button
                  onClick={() => setCurrentStep(0)}
                  className="text-lg px-8 py-6 rounded-xl"
                  style={{ backgroundColor: brandColor, color: '#000' }}
                >
                  Comecar
                </Button>
                <p className="text-xs text-gray-600">{steps.length} perguntas — 2 min</p>
              </div>
            )}

            {/* ── QUIZ STEPS ── */}
            {currentStep >= 0 && currentStep < steps.length && (
              <div className="space-y-6 animate-fadeIn" key={currentStep}>
                <div className="text-xs text-gray-500 mb-2">
                  {currentStep + 1} / {totalSteps}
                </div>

                <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                  {steps[currentStep].question}
                </h2>

                {steps[currentStep].description && (
                  <p className="text-gray-400">{steps[currentStep].description}</p>
                )}

                {/* Render field based on type */}
                {renderField(steps[currentStep], answers, setAnswer, toggleMultiSelect, brandColor)}

                <div className="flex gap-3 pt-4">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(s => s - 1)}
                      className="flex-1 py-6 text-lg border-zinc-700 text-white hover:bg-zinc-800"
                    >
                      Voltar
                    </Button>
                  )}
                  <Button
                    onClick={() => setCurrentStep(s => s + 1)}
                    disabled={!canProceed()}
                    className="flex-1 py-6 text-lg rounded-xl disabled:opacity-30"
                    style={{ backgroundColor: brandColor, color: '#000' }}
                  >
                    Seguinte
                  </Button>
                </div>
              </div>
            )}

            {/* ── CONTACT INFO STEP ── */}
            {currentStep === steps.length && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-xs text-gray-500 mb-2">
                  {totalSteps} / {totalSteps}
                </div>

                <h2 className="text-2xl md:text-3xl font-bold">
                  Como podemos contacta-lo?
                </h2>
                <p className="text-gray-400">
                  Enviaremos as melhores opcoes diretamente para o seu Telegram.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Nome *</Label>
                    <Input
                      className="bg-zinc-900 border-zinc-700 text-lg py-6"
                      value={contactInfo.name}
                      onChange={e => setContactInfo(c => ({ ...c, name: e.target.value }))}
                      placeholder="Joao Silva"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Telegram username</Label>
                    <Input
                      className="bg-zinc-900 border-zinc-700 text-lg py-6"
                      value={contactInfo.telegram_username}
                      onChange={e => setContactInfo(c => ({ ...c, telegram_username: e.target.value }))}
                      placeholder="@seunome"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Email</Label>
                    <Input
                      className="bg-zinc-900 border-zinc-700 text-lg py-6"
                      type="email"
                      value={contactInfo.email}
                      onChange={e => setContactInfo(c => ({ ...c, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Telefone</Label>
                    <Input
                      className="bg-zinc-900 border-zinc-700 text-lg py-6"
                      value={contactInfo.phone}
                      onChange={e => setContactInfo(c => ({ ...c, phone: e.target.value }))}
                      placeholder="+351..."
                    />
                  </div>
                </div>

                {error && <div className="p-3 bg-red-900/50 text-red-300 rounded">{error}</div>}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(s => s - 1)}
                    className="flex-1 py-6 text-lg border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !contactInfo.name}
                    className="flex-1 py-6 text-lg rounded-xl disabled:opacity-30"
                    style={{ backgroundColor: brandColor, color: '#000' }}
                  >
                    {submitting ? 'A enviar...' : 'Enviar'}
                  </Button>
                </div>

                <p className="text-[11px] text-gray-600 text-center">
                  Ao submeter, concorda com o uso dos seus dados para sugestoes de propriedades.
                  Pode cancelar a qualquer momento.
                </p>
              </div>
            )}

            {/* ── COMPLETION ── */}
            {currentStep > steps.length && (
              <div className="text-center space-y-6 animate-fadeIn">
                <div className="text-6xl">✓</div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  {quiz.completion_message}
                </h2>
                <p className="text-gray-400">
                  Vamos analisar as suas preferencias e enviar-lhe propriedades que correspondam ao que procura.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.35s ease-out;
        }
      `}</style>
    </>
  )
}

function renderField(
  step: Step,
  answers: Record<string, any>,
  setAnswer: (key: string, value: any) => void,
  toggleMultiSelect: (key: string, value: string) => void,
  brandColor: string,
) {
  const { field_key, field_type, options, placeholder, min_value, max_value, step_unit } = step
  const value = answers[field_key]

  switch (field_type) {
    case 'select':
      return (
        <div className="grid grid-cols-2 gap-3">
          {(options || []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAnswer(field_key, opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                value === opt.value
                  ? 'border-white bg-zinc-800'
                  : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {opt.icon && <span className="text-2xl block mb-1">{opt.icon}</span>}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      )

    case 'multi_select':
      return (
        <div className="grid grid-cols-2 gap-3">
          {(options || []).map((opt) => {
            const selected = (value || []).includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleMultiSelect(field_key, opt.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? 'border-white bg-zinc-800'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {opt.icon && <span className="text-2xl block mb-1">{opt.icon}</span>}
                <span className="text-sm font-medium">{opt.label}</span>
                {selected && <span className="float-right text-green-400">✓</span>}
              </button>
            )
          })}
        </div>
      )

    case 'range':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs">Min {step_unit}</Label>
              <Input
                className="bg-zinc-900 border-zinc-700 text-lg py-6"
                type="number"
                value={answers[`${field_key}_min`] || ''}
                onChange={e => setAnswer(`${field_key}_min`, e.target.value)}
                placeholder={min_value ? String(min_value) : 'Min'}
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Max {step_unit}</Label>
              <Input
                className="bg-zinc-900 border-zinc-700 text-lg py-6"
                type="number"
                value={answers[`${field_key}_max`] || ''}
                onChange={e => setAnswer(`${field_key}_max`, e.target.value)}
                placeholder={max_value ? String(max_value) : 'Max'}
              />
            </div>
          </div>
        </div>
      )

    case 'number':
      return (
        <Input
          className="bg-zinc-900 border-zinc-700 text-lg py-6"
          type="number"
          value={value || ''}
          onChange={e => setAnswer(field_key, e.target.value)}
          placeholder={placeholder || ''}
          min={min_value}
          max={max_value}
          autoFocus
        />
      )

    case 'text':
    case 'email':
    case 'tel':
      return (
        <Input
          className="bg-zinc-900 border-zinc-700 text-lg py-6"
          type={field_type}
          value={value || ''}
          onChange={e => setAnswer(field_key, e.target.value)}
          placeholder={placeholder || ''}
          autoFocus
        />
      )

    case 'location':
      return (
        <div className="grid grid-cols-2 gap-3">
          {(options || []).map((opt) => {
            const selected = (value || []).includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleMultiSelect(field_key, opt.value)}
                className={`p-3 rounded-xl border-2 text-sm transition-all ${
                  selected
                    ? 'border-white bg-zinc-800'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {opt.label}
                {selected && <span className="ml-2 text-green-400">✓</span>}
              </button>
            )
          })}
        </div>
      )

    default:
      return null
  }
}
