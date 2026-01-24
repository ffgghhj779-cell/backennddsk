/**
 * Entity Extractor - Flexible extraction of entities from messages
 * Understands variations, typos, and natural language
 */

const logger = require('../../utils/logger');

class EntityExtractor {
  constructor() {
    this.productMap = this.buildProductMap();
    this.brandMap = this.buildBrandMap();
    this.sizePatterns = this.buildSizePatterns();
    this.quantityPatterns = this.buildQuantityPatterns();
  }

  /**
   * Build comprehensive product mappings
   */
  buildProductMap() {
    return {
      'معجون': {
        canonical: 'معجون',
        variations: ['معجون', 'معاجين', 'putty', 'بوتي', 'بوتى', 'potty', 'معاجن'],
        englishName: 'Putty'
      },
      'فيلر': {
        canonical: 'فيلر',
        variations: ['فيلر', 'فلر', 'فيللر', 'فلير', 'filler', 'feler', 'فايلر'],
        englishName: 'Filler'
      },
      'برايمر': {
        canonical: 'برايمر',
        variations: ['برايمر', 'برايم', 'بريمر', 'برايمير', 'primer', 'primer', 'برمر'],
        englishName: 'Primer'
      },
      'ثنر': {
        canonical: 'ثنر',
        variations: ['ثنر', 'تنر', 'ثينر', 'مخفف', 'thinner', 'tinner', 'thiner'],
        englishName: 'Thinner'
      },
      'سبراي': {
        canonical: 'سبراي',
        variations: ['سبراي', 'اسبراي', 'سبري', 'رش', 'spray', 'spry', 'اسبري'],
        englishName: 'Spray'
      },
      'دوكو': {
        canonical: 'دوكو',
        variations: ['دوكو', 'دوكة', 'دوكه', 'duco', 'duko', 'دكو'],
        englishName: 'Duco'
      }
    };
  }

  /**
   * Build brand mappings
   */
  buildBrandMap() {
    return {
      'NUMIX': ['numix', 'نيوميكس', 'نوميكس', 'نيومكس'],
      'Top Plus': ['top plus', 'توب بلس', 'توب', 'topplus', 'top+'],
      'NC Duco': ['nc duco', 'nc', 'ان سي', 'ان سي دوكو', 'ncduco'],
      'أردني': ['اردني', 'اردنى', 'jordanian', 'أردنى'],
      'NCR': ['ncr', 'ان سي ار', 'ان سى ار']
    };
  }

  /**
   * Build flexible size patterns
   */
  buildSizePatterns() {
    return [
      // Explicit numbers with units
      { 
        regex: /(\d+\.?\d*)\s*(كجم|كيلو|كغم|كج|كلو|kg|kilo|kilogram)/i, 
        unit: 'كجم',
        extract: (match) => ({ value: match[1], unit: 'كجم' })
      },
      { 
        regex: /(\d+\.?\d*)\s*(لتر|ليتر|لت|لیتر|liter|litre|l)/i, 
        unit: 'لتر',
        extract: (match) => ({ value: match[1], unit: 'لتر' })
      },
      { 
        regex: /(\d+\.?\d*)\s*(جالون|غالون|جلون|gallon|galon)/i, 
        unit: 'جالون',
        extract: (match) => ({ value: match[1], unit: 'جالون' })
      },
      { 
        regex: /(\d+\.?\d*)\s*(جرام|غرام|جم|gram|gr|g)/i, 
        unit: 'جرام',
        extract: (match) => ({ value: match[1], unit: 'جرام' })
      },
      
      // Just units (implies 1)
      { 
        regex: /(كيلو|كجم|كغم|كلو)/i, 
        extract: () => ({ value: '1', unit: 'كجم', implied: true })
      },
      { 
        regex: /(لتر|ليتر)/i, 
        extract: () => ({ value: '1', unit: 'لتر', implied: true })
      },
      { 
        regex: /(جالون|غالون|جلون)/i, 
        extract: () => ({ value: '1', unit: 'جالون', implied: true })
      },
      
      // Common specific sizes
      { 
        regex: /نصف\s*(كيلو|كجم|كغم)/i, 
        extract: () => ({ value: '0.5', unit: 'كجم' })
      },
      { 
        regex: /ربع\s*(كيلو|كجم)/i, 
        extract: () => ({ value: '0.25', unit: 'كجم' })
      },
      { 
        regex: /(اتنين|2)\s*(و|\.)\s*(تمان|8)|2\.8|٢\.٨/i, 
        extract: () => ({ value: '2.8', unit: 'كجم' })
      },
      
      // Written numbers
      { 
        regex: /واحد(?!\s*(كرتون|حبه|قطع))/i, 
        extract: () => ({ value: '1', unit: null, ambiguous: true })
      },
      { 
        regex: /اتنين|تنين(?!\s*(كرتون|حبه|قطع))/i, 
        extract: () => ({ value: '2', unit: null, ambiguous: true })
      },
      { 
        regex: /تلات|ثلاث|تلته(?!\s*(كرتون|حبه|قطع))/i, 
        extract: () => ({ value: '3', unit: null, ambiguous: true })
      },
      { 
        regex: /خمس|خمسه(?!\s*(كرتون|حبه|قطع))/i, 
        extract: () => ({ value: '5', unit: null, ambiguous: true })
      },
      
      // Just numbers (might be size or quantity - context dependent)
      {
        regex: /\b(\d+\.?\d*)\b(?!\s*(كرتون|حبه|قطع|carton|piece))/i,
        extract: (match) => ({ value: match[1], unit: null, ambiguous: true })
      }
    ];
  }

  /**
   * Build flexible quantity patterns
   */
  buildQuantityPatterns() {
    return [
      // Explicit cartons with numbers
      { 
        regex: /(\d+)\s*(كرتونه|كرتون|كراتين|carton|box|كرطون)/i,
        extract: (match) => ({ value: match[1], type: 'carton' })
      },
      { 
        regex: /كرتونتين|2\s*كرتون/i,
        extract: () => ({ value: '2', type: 'carton' })
      },
      
      // Just "كرتونة" or "كرتون" alone (no number)
      { 
        regex: /^(كرتونه|كرتون|carton)$/i,
        extract: () => ({ value: '1', type: 'carton' })
      },
      { 
        regex: /(كرتونه|كرتون|carton)(?!\s*\d)/i,
        extract: () => ({ value: '1', type: 'carton' })
      },
      
      // Pieces with numbers
      { 
        regex: /(\d+)\s*(حبه|حبات|قطعه|قطع|piece|unit|pieces)/i,
        extract: (match) => ({ value: match[1], type: 'piece' })
      },
      { 
        regex: /حبتين|2\s*حبه/i,
        extract: () => ({ value: '2', type: 'piece' })
      },
      
      // Just "حبة" alone
      { 
        regex: /^(حبه|قطعه|piece)$/i,
        extract: () => ({ value: '1', type: 'piece' })
      },
      { 
        regex: /(حبه|قطعه|piece)(?!\s*\d)/i,
        extract: () => ({ value: '1', type: 'piece' })
      },
      
      // Written numbers (context: likely quantity)
      { 
        regex: /(واحد|واحده)\s*(من|فقط)?$/i,
        extract: () => ({ value: '1', type: 'unit', ambiguous: true })
      },
      { 
        regex: /(اتنين|تنين)\s*(من|فقط)?$/i,
        extract: () => ({ value: '2', type: 'unit', ambiguous: true })
      },
      { 
        regex: /(تلات|ثلاث|تلته)\s*(من|فقط)?$/i,
        extract: () => ({ value: '3', type: 'unit', ambiguous: true })
      }
    ];
  }

  /**
   * Normalize text
   */
  normalize(text) {
    if (!text) return '';
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    return normalized;
  }

  /**
   * Extract product name
   */
  extractProduct(message) {
    const normalized = this.normalize(message);
    
    for (const [canonical, productDef] of Object.entries(this.productMap)) {
      for (const variation of productDef.variations) {
        if (normalized.includes(this.normalize(variation))) {
          return {
            canonical,
            englishName: productDef.englishName,
            matched: variation,
            confidence: 0.9
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract brand
   */
  extractBrand(message) {
    const normalized = this.normalize(message);
    
    for (const [brandName, variations] of Object.entries(this.brandMap)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalize(variation))) {
          return {
            name: brandName,
            matched: variation,
            confidence: 0.85
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract size
   */
  extractSize(message) {
    const normalized = this.normalize(message);
    
    for (const pattern of this.sizePatterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        const result = pattern.extract(match);
        return {
          ...result,
          raw: match[0],
          confidence: result.ambiguous ? 0.6 : 0.9
        };
      }
    }
    
    return null;
  }

  /**
   * Extract quantity
   */
  extractQuantity(message) {
    const normalized = this.normalize(message);
    
    for (const pattern of this.quantityPatterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        const result = pattern.extract(match);
        return {
          ...result,
          raw: match[0],
          confidence: result.ambiguous ? 0.6 : 0.9
        };
      }
    }
    
    return null;
  }

  /**
   * Extract product type (for products with types like filler K1/K2)
   */
  extractType(message) {
    const normalized = this.normalize(message);
    
    const types = {
      'K1': ['k1', 'كي 1', 'كي1', 'سريع', 'fast'],
      'K2': ['k2', 'كي 2', 'كي2', 'بطي', 'بطئ', 'slow'],
      '121': ['121', '١٢١', 'عادي', 'normal', 'standard'],
      '202': ['202', '٢٠٢', 'سريع', 'fast'],
      '204': ['204', '٢٠٤', 'بطي', 'بطئ', 'slow']
    };
    
    for (const [typeName, variations] of Object.entries(types)) {
      for (const variation of variations) {
        if (normalized.includes(this.normalize(variation))) {
          return {
            name: typeName,
            matched: variation,
            confidence: 0.85
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract all entities from message
   */
  extractAll(message) {
    return {
      product: this.extractProduct(message),
      brand: this.extractBrand(message),
      size: this.extractSize(message),
      quantity: this.extractQuantity(message),
      type: this.extractType(message)
    };
  }

  /**
   * Check completeness for product inquiry
   */
  checkCompleteness(entities) {
    const required = {
      hasProduct: !!entities.product,
      hasSize: !!entities.size && !entities.size.ambiguous,
      hasQuantity: !!entities.quantity && !entities.quantity.ambiguous
    };
    
    const complete = required.hasProduct && required.hasSize && required.hasQuantity;
    const missing = [];
    
    if (!required.hasProduct) missing.push('product');
    if (!required.hasSize) missing.push('size');
    if (!required.hasQuantity) missing.push('quantity');
    
    return {
      complete,
      required,
      missing,
      confidence: Object.values(required).filter(v => v).length / 3
    };
  }
}

module.exports = new EntityExtractor();
