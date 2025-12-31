'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Layers,
} from 'lucide-react'

interface ComparisonResult {
  summary: string
  scope_analysis?: {
    categories_found: string[]
    common_categories: string[]
    scope_differences: Array<{
      supplier: string
      extra_categories: string[]
      extra_value: number
      missing_categories: string[]
    }>
    warning: string
  }
  price_comparison: {
    ranking: Array<{
      supplier: string
      total?: number
      raw_total?: number
      adjusted_total?: number
      adjustment_details?: string
      difference_from_lowest: number
      percent_difference: number
    }>
    price_notes: string
    comparison_basis?: string
  }
  specification_compliance: {
    per_supplier: Array<{
      supplier: string
      compliance_score: number
      meets_requirements: string[]
      missing_or_deviating: string[]
      extras_included: string[]
    }>
  }
  pros_cons: Array<{
    supplier: string
    pros: string[]
    cons: string[]
  }>
  recommendation: {
    recommended_supplier: string
    reasoning: string
    caveats: string[]
    negotiation_points: string[]
  }
  questions_to_clarify: Array<{
    supplier: string
    question: string
  }>
}

interface ComparisonViewProps {
  comparison: ComparisonResult
}

export function ComparisonView({ comparison }: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Sammanfattning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300">{comparison.summary}</p>
        </CardContent>
      </Card>

      {/* Scope Analysis - Warning about different scope */}
      {comparison.scope_analysis && comparison.scope_analysis.warning && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Omfattningsanalys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-amber-400 font-medium">{comparison.scope_analysis.warning}</p>

              {comparison.scope_analysis.categories_found.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Produktkategorier i offerterna:</p>
                  <div className="flex flex-wrap gap-2">
                    {comparison.scope_analysis.categories_found.map((cat, i) => (
                      <Badge
                        key={i}
                        variant={comparison.scope_analysis?.common_categories.includes(cat) ? 'info' : 'warning'}
                      >
                        {cat}
                        {!comparison.scope_analysis?.common_categories.includes(cat) && ' (ej i alla)'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {comparison.scope_analysis.scope_differences.some(d => d.extra_categories.length > 0 || d.missing_categories.length > 0) && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Skillnader per leverantör:</p>
                  {comparison.scope_analysis.scope_differences.map((diff, i) => (
                    (diff.extra_categories.length > 0 || diff.missing_categories.length > 0) && (
                      <div key={i} className="p-3 bg-[#1e2a36] rounded-lg text-sm">
                        <p className="font-medium text-slate-200 mb-1">{diff.supplier}</p>
                        {diff.extra_categories.length > 0 && (
                          <p className="text-cyan-400">
                            + Extra: {diff.extra_categories.join(', ')}
                            {diff.extra_value > 0 && ` (${formatPrice(diff.extra_value)})`}
                          </p>
                        )}
                        {diff.missing_categories.length > 0 && (
                          <p className="text-red-400">- Saknas: {diff.missing_categories.join(', ')}</p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Prisjämförelse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Comparison basis info */}
            {comparison.price_comparison.comparison_basis && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                <p className="text-sm text-cyan-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <strong>Jämförelsebas:</strong> {comparison.price_comparison.comparison_basis}
                </p>
              </div>
            )}

            {comparison.price_comparison.ranking.map((item, index) => {
              // Support both old (total) and new (raw_total/adjusted_total) format
              const displayTotal = item.adjusted_total ?? item.raw_total ?? item.total ?? 0
              const rawTotal = item.raw_total ?? item.total
              const hasAdjustment = item.adjusted_total !== undefined && item.raw_total !== undefined && item.adjusted_total !== item.raw_total

              return (
                <div
                  key={item.supplier}
                  className={`p-4 rounded-lg ${
                    index === 0
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-[#1e2a36]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-200">{item.supplier}</p>
                        {item.difference_from_lowest > 0 && (
                          <p className="text-sm text-slate-400">
                            +{formatPrice(item.difference_from_lowest)} ({item.percent_difference.toFixed(1)}% dyrare)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold font-mono ${index === 0 ? 'text-green-400' : 'text-slate-300'}`}>
                        {formatPrice(displayTotal)}
                      </p>
                      {hasAdjustment && rawTotal && (
                        <p className="text-xs text-slate-500">
                          Råtotal: {formatPrice(rawTotal)}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.adjustment_details && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      {item.adjustment_details}
                    </p>
                  )}
                </div>
              )
            })}

            {comparison.price_comparison.price_notes && (
              <p className="text-sm text-slate-400 mt-4 p-3 bg-[#1e2a36] rounded-lg">
                <strong>Observationer:</strong> {comparison.price_comparison.price_notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Specification Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Specifikationsefterlevnad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {comparison.specification_compliance.per_supplier.map((supplier) => (
              <div key={supplier.supplier} className="p-4 bg-[#1e2a36] rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-slate-200">{supplier.supplier}</h4>
                  <Badge
                    variant={
                      supplier.compliance_score >= 80
                        ? 'success'
                        : supplier.compliance_score >= 60
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {supplier.compliance_score}% uppfyllt
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      supplier.compliance_score >= 80
                        ? 'bg-green-500'
                        : supplier.compliance_score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${supplier.compliance_score}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {supplier.meets_requirements.length > 0 && (
                    <div>
                      <p className="text-green-400 font-medium mb-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Uppfyller
                      </p>
                      <ul className="space-y-1.5 text-slate-400">
                        {supplier.meets_requirements.slice(0, 5).map((req, i) => (
                          <li key={i} className="break-words">• {req}</li>
                        ))}
                        {supplier.meets_requirements.length > 5 && (
                          <li className="text-slate-500">
                            +{supplier.meets_requirements.length - 5} till
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {supplier.missing_or_deviating.length > 0 && (
                    <div>
                      <p className="text-red-400 font-medium mb-2 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Saknas/Avviker
                      </p>
                      <ul className="space-y-1.5 text-slate-400">
                        {supplier.missing_or_deviating.slice(0, 5).map((item, i) => (
                          <li key={i} className="break-words">• {item}</li>
                        ))}
                        {supplier.missing_or_deviating.length > 5 && (
                          <li className="text-slate-500">
                            +{supplier.missing_or_deviating.length - 5} till
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {supplier.extras_included.length > 0 && (
                    <div>
                      <p className="text-cyan-400 font-medium mb-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Extra
                      </p>
                      <ul className="space-y-1.5 text-slate-400">
                        {supplier.extras_included.slice(0, 5).map((extra, i) => (
                          <li key={i} className="break-words">• {extra}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pros & Cons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-purple-400" />
            För- och nackdelar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparison.pros_cons.map((supplier) => (
              <div key={supplier.supplier} className="p-4 bg-[#1e2a36] rounded-lg">
                <h4 className="font-medium text-slate-200 mb-4">{supplier.supplier}</h4>

                <div className="space-y-4">
                  {supplier.pros.length > 0 && (
                    <div>
                      <p className="text-green-400 text-sm font-medium mb-2 flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        Fördelar
                      </p>
                      <ul className="space-y-1 text-sm text-slate-400">
                        {supplier.pros.map((pro, i) => (
                          <li key={i} className="break-words">• {pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {supplier.cons.length > 0 && (
                    <div>
                      <p className="text-red-400 text-sm font-medium mb-2 flex items-center gap-1">
                        <ThumbsDown className="w-4 h-4" />
                        Nackdelar
                      </p>
                      <ul className="space-y-1 text-sm text-slate-400">
                        {supplier.cons.map((con, i) => (
                          <li key={i} className="break-words">• {con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-cyan-500/50 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" />
            Rekommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="success" className="text-base px-4 py-1">
                {comparison.recommendation.recommended_supplier}
              </Badge>
            </div>

            <p className="text-slate-300">{comparison.recommendation.reasoning}</p>

            {comparison.recommendation.caveats.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Förbehåll
                </p>
                <ul className="text-sm text-slate-400 space-y-1">
                  {comparison.recommendation.caveats.map((caveat, i) => (
                    <li key={i} className="break-words">• {caveat}</li>
                  ))}
                </ul>
              </div>
            )}

            {comparison.recommendation.negotiation_points.length > 0 && (
              <div className="p-3 bg-[#1e2a36] rounded-lg">
                <p className="text-cyan-400 text-sm font-medium mb-2">Förhandlingspunkter</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  {comparison.recommendation.negotiation_points.map((point, i) => (
                    <li key={i} className="break-words">• {point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions to Clarify */}
      {comparison.questions_to_clarify.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-yellow-400" />
              Frågor att förtydliga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.questions_to_clarify.map((item, i) => (
                <div key={i} className="p-3 bg-[#1e2a36] rounded-lg">
                  <Badge variant="default" className="mb-2">
                    {item.supplier}
                  </Badge>
                  <p className="text-sm text-slate-300 break-words">{item.question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
