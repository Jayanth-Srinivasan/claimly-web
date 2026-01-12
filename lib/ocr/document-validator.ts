import { OCRService, type OCRResult } from './vision'
import { validateFile } from './validators'

export interface DocumentValidationOptions {
  claimId?: string
  expectedTypes?: string[] // e.g., ['receipt', 'invoice', 'medical bill', 'damage_photo']
  checkDamage?: boolean
  expectedDescription?: string // e.g., "rental car exterior damage", "medical receipt"
  requireDamage?: boolean // force damage presence for damage-related incidents
}

export interface DocumentValidationResult {
  success: boolean
  validation_error?: string
  storage_path?: string
  ocr?: OCRResult
  damage_assessment?: {
    present: boolean
    description?: string
    severity?: 'low' | 'medium' | 'high'
    confidence?: 'low' | 'medium' | 'high'
  }
  risk_flags?: string[]
  needs_reupload?: boolean
}

export class DocumentValidator {
  private ocr: OCRService

  constructor() {
    this.ocr = new OCRService()
  }

  /**
   * Validate and analyze a document.
   * - Runs file-type/size checks.
   * - Performs OCR (image or PDF).
   * - Optionally inspects for damage evidence in images.
   */
  async validate(
    file: File,
    options: DocumentValidationOptions = {}
  ): Promise<DocumentValidationResult> {
    const basic = validateFile(file)
    if (!basic.ok) {
      return { success: false, validation_error: basic.reason }
    }

    // OCR
    const ocrResult = await this.ocr.process(file)

    const riskFlags: string[] = []
    let needsReupload = false
    if (options.expectedTypes && ocrResult.document_type) {
      const normalized = ocrResult.document_type.toLowerCase()
      const mismatch = !options.expectedTypes.some((t) =>
        normalized.includes(t.toLowerCase())
      )
      if (mismatch) {
        riskFlags.push(`Document type mismatch (expected ${options.expectedTypes.join(', ')})`)
        needsReupload = true
      }
    }

    // Optional: damage assessment for images
    let damageAssessment: DocumentValidationResult['damage_assessment']
    const requireDamage = options.requireDamage === true

    if (options.checkDamage && file.type.startsWith('image/')) {
      const damage = await this.ocr.assessDamage(file)
      damageAssessment = damage
      if (damage.present && damage.confidence === 'low') {
        riskFlags.push('Damage detected with low confidence; manual review advised')
      }
      if (requireDamage && !damage.present) {
        riskFlags.push('Damage not detected in image; please upload clear damage photos')
        needsReupload = true
      }
    }

    // Semantic match for uploaded image vs expected description (e.g., rental car damage)
    if (options.expectedDescription && file.type.startsWith('image/')) {
      const semanticCheck = await this.ocr.checkImageMatchesIntent(file, options.expectedDescription)
      if (!semanticCheck.match) {
        riskFlags.push(
          `Uploaded image does not match expected context: ${options.expectedDescription}`
        )
        needsReupload = true
      }
    }

    return {
      success: true,
      ocr: ocrResult,
      damage_assessment: damageAssessment,
      risk_flags: riskFlags,
      needs_reupload: needsReupload,
    }
  }

}
