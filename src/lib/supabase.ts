import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface Project {
  id: string
  name: string
  project_number?: string
  address?: string
  client?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface QuoteCategory {
  id: string
  project_id: string
  name: string
  description?: string
  created_at: string
}

export interface Specification {
  id: string
  project_id: string
  category_id?: string
  name: string
  file_path?: string
  extracted_text?: string
  requirements?: Record<string, unknown>
  created_at: string
}

export interface Quote {
  id: string
  category_id: string
  supplier_name: string
  quote_number?: string
  quote_date?: string
  valid_until?: string
  contact_person?: string
  contact_email?: string
  contact_phone?: string
  total_amount?: number
  currency: string
  vat_included: boolean
  payment_terms?: string
  delivery_terms?: string
  warranty_period?: string
  file_path?: string
  extracted_text?: string
  ai_summary?: string
  ai_analysis?: Record<string, unknown>
  status: 'pending' | 'analyzed' | 'received' | 'reviewing' | 'selected' | 'rejected'
  notes?: string
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  position?: string
  article_number?: string
  description: string
  quantity?: number
  unit: string
  unit_price?: number
  discount_percent?: number
  net_price?: number
  total_amount?: number
  item_type?: 'product' | 'accessory' | 'service' | 'option'
  product_category?: string
  specifications?: Record<string, unknown>
  created_at: string
}

export interface Comparison {
  id: string
  category_id: string
  quote_ids: string[]
  comparison_summary?: string
  price_analysis?: Record<string, unknown>
  specification_compliance?: Record<string, unknown>
  pros_cons?: Record<string, unknown>
  recommendation?: string
  recommendation_reasoning?: string
  created_at: string
}
