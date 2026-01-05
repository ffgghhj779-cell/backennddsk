/**
 * Knowledge Manager Service
 * Loads and manages all structured knowledge from JSON files
 * Provides intelligent search and retrieval of business information
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class KnowledgeManager {
  constructor() {
    this.knowledge = {
      business: {},
      products: {},
      conversation: {},
      loaded: false
    };
  }

  /**
   * Load all knowledge files from the knowledge directory
   */
  async loadAll() {
    try {
      logger.info('Loading knowledge base...');

      // Load business knowledge
      this.knowledge.business = {
        companyInfo: await this.loadJSON('knowledge/business/company_info.json'),
        policies: await this.loadJSON('knowledge/business/policies.json'),
        hoursLocations: await this.loadJSON('knowledge/business/hours_locations.json')
      };

      // Load product knowledge
      this.knowledge.products = {
        catalog: await this.loadJSON('knowledge/products/catalog.json'),
        pricing: await this.loadJSON('knowledge/products/pricing.json')
      };

      // Load conversation knowledge
      this.knowledge.conversation = {
        personality: await this.loadJSON('knowledge/conversation/personality.json'),
        intents: await this.loadJSON('knowledge/conversation/intents.json'),
        responses: await this.loadJSON('knowledge/conversation/responses.json')
      };

      this.knowledge.loaded = true;
      
      logger.info('✓ Knowledge base loaded successfully', {
        business: Object.keys(this.knowledge.business).length,
        products: Object.keys(this.knowledge.products).length,
        conversation: Object.keys(this.knowledge.conversation).length
      });

      return true;
    } catch (error) {
      logger.error('Error loading knowledge base:', error);
      this.knowledge.loaded = false;
      return false;
    }
  }

  /**
   * Load a JSON file
   */
  async loadJSON(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Knowledge file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Error loading ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if knowledge is loaded
   */
  isLoaded() {
    return this.knowledge.loaded;
  }

  /**
   * Get company information
   */
  getCompanyInfo() {
    return this.knowledge.business.companyInfo;
  }

  /**
   * Get business policies
   */
  getPolicies() {
    return this.knowledge.business.policies;
  }

  /**
   * Get working hours and locations
   */
  getHoursAndLocations() {
    return this.knowledge.business.hoursLocations;
  }

  /**
   * Get product catalog
   */
  getProductCatalog() {
    return this.knowledge.products.catalog;
  }

  /**
   * Get pricing information
   */
  getPricing() {
    return this.knowledge.products.pricing;
  }

  /**
   * Search for a product by name or keyword
   */
  searchProduct(query) {
    const catalog = this.getProductCatalog();
    if (!catalog) return null;

    const normalizedQuery = query.toLowerCase().trim();
    const results = [];

    // Search through categories
    for (const category of catalog.categories) {
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          // Check if query matches subcategory name
          if (subcategory.name.includes(normalizedQuery) || 
              subcategory.name_en?.toLowerCase().includes(normalizedQuery)) {
            results.push({
              category: category.name,
              subcategory: subcategory.name,
              details: subcategory
            });
          }

          // Check if query matches brand
          if (subcategory.brands) {
            for (const brand of subcategory.brands) {
              if (brand.toLowerCase().includes(normalizedQuery)) {
                results.push({
                  category: category.name,
                  subcategory: subcategory.name,
                  brand: brand,
                  details: subcategory
                });
              }
            }
          }
        }
      }
    }

    return results.length > 0 ? results : null;
  }

  /**
   * Find price for a specific product
   */
  findPrice(productName, size = null) {
    const pricing = this.getPricing();
    if (!pricing) return null;

    const normalizedName = productName.toLowerCase().trim();
    const results = [];

    // Search through all product categories
    for (const [categoryKey, categoryData] of Object.entries(pricing.products)) {
      if (categoryData.items) {
        for (const item of categoryData.items) {
          const itemName = item.name.toLowerCase();
          
          // Check if product name matches
          if (itemName.includes(normalizedName) || normalizedName.includes(itemName)) {
            // If size is specified, check if it matches
            if (size) {
              const normalizedSize = size.toLowerCase();
              const itemSize = item.size.toLowerCase();
              
              if (itemSize.includes(normalizedSize) || normalizedSize.includes(itemSize)) {
                results.push(item);
              }
            } else {
              results.push(item);
            }
          }
        }
      }
    }

    return results.length > 0 ? results : null;
  }

  /**
   * Get contact information based on purpose
   */
  getContact(purpose = 'general') {
    const hoursLocations = this.getHoursAndLocations();
    if (!hoursLocations) return null;

    const contacts = hoursLocations.contact_directory;

    switch (purpose.toLowerCase()) {
      case 'wholesale':
      case 'price':
      case 'جملة':
      case 'سعر':
        return contacts.wholesale_department;
      
      case 'spray':
      case 'booth':
      case 'كابينة':
      case 'رش':
        return contacts.spray_booth;
      
      case 'general':
      case 'customer_service':
      case 'عام':
        return contacts.customer_service;
      
      default:
        return contacts;
    }
  }

  /**
   * Get all locations
   */
  getLocations() {
    const hoursLocations = this.getHoursAndLocations();
    return hoursLocations?.locations || [];
  }

  /**
   * Get working hours
   */
  getWorkingHours() {
    const hoursLocations = this.getHoursAndLocations();
    return hoursLocations?.working_hours || null;
  }

  /**
   * Get personality configuration
   */
  getPersonality() {
    return this.knowledge.conversation.personality;
  }

  /**
   * Get all intents
   */
  getIntents() {
    return this.knowledge.conversation.intents;
  }

  /**
   * Get response templates
   */
  getResponseTemplates() {
    return this.knowledge.conversation.responses;
  }

  /**
   * Check if customer is wholesale (not individual)
   */
  isWholesaleCustomer(message) {
    const individualKeywords = ['فرد', 'واحد', 'قطعة', 'حبة واحدة', 'لنفسي', 'شخصي'];
    const wholesaleKeywords = ['جملة', 'كمية', 'كرتونة', 'محل', 'موزع', 'ورشة'];
    
    const normalizedMessage = message.toLowerCase();
    
    const hasIndividualKeyword = individualKeywords.some(kw => normalizedMessage.includes(kw));
    const hasWholesaleKeyword = wholesaleKeywords.some(kw => normalizedMessage.includes(kw));
    
    if (hasIndividualKeyword && !hasWholesaleKeyword) {
      return false; // Individual customer
    }
    
    return true; // Assume wholesale unless proven otherwise
  }

  /**
   * Format price information for display
   */
  formatPrice(priceData) {
    if (!priceData) return null;

    let formatted = `📦 ${priceData.name}\n`;
    formatted += `📏 الحجم: ${priceData.size}\n`;
    
    if (priceData.price_without_tax) {
      formatted += `💵 بدون ضريبة: ${priceData.price_without_tax} جنيه\n`;
    }
    
    if (priceData.price_with_tax) {
      formatted += `💰 بالضريبة: ${priceData.price_with_tax} جنيه\n`;
    }
    
    if (priceData.carton_price) {
      formatted += `📦 سعر الكرتونة: ${priceData.carton_price} جنيه\n`;
    }

    if (priceData.note) {
      formatted += `\n📌 ${priceData.note}`;
    }

    return formatted;
  }

  /**
   * Format multiple prices for display
   */
  formatMultiplePrices(priceList) {
    if (!priceList || priceList.length === 0) return null;

    let formatted = '📋 الأسعار المتاحة:\n\n';
    
    priceList.forEach((price, index) => {
      formatted += `${index + 1}. ${this.formatPrice(price)}\n`;
    });

    formatted += '\n💼 ملحوظة: جميع الأسعار جملة فقط\n';
    formatted += '📞 للطلب: 01155501111';

    return formatted;
  }

  /**
   * Get structured data for AI context
   */
  getAIContext() {
    return {
      company: this.getCompanyInfo(),
      policies: this.getPolicies(),
      hours: this.getWorkingHours(),
      locations: this.getLocations(),
      personality: this.getPersonality(),
      available: this.isLoaded()
    };
  }
}

// Create singleton instance
const knowledgeManager = new KnowledgeManager();

module.exports = knowledgeManager;
