
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEXTOOLS_API_KEY = 'XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

// Memory cache to avoid excessive API calls
const cache: Record<string, { data: any, timestamp: number }> = {}
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    })
  }

  try {
    // Parse request body
    const { tokenAddress, chain, type } = await req.json()

    // Validate input
    if (!tokenAddress || !chain || !type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        }),
        {
          status: 400,
          headers: CORS_HEADERS
        }
      )
    }

    // Only support Solana for now
    if (chain !== 'solana') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only Solana chain is supported'
        }),
        {
          status: 400,
          headers: CORS_HEADERS
        }
      )
    }

    // Check cache first
    const cacheKey = `${chain}-${tokenAddress}-${type}`
    const now = Date.now()
    
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
      console.log(`Cache hit for ${cacheKey}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: cache[cacheKey].data
        }),
        {
          status: 200,
          headers: CORS_HEADERS
        }
      )
    }

    let url = ''
    if (type === 'token') {
      url = `https://public-api.dextools.io/trial/v2/token/${chain}/${tokenAddress}`
    } else if (type === 'price') {
      url = `https://public-api.dextools.io/trial/v2/token/${chain}/${tokenAddress}/price`
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Must be "token" or "price"'
        }),
        {
          status: 400,
          headers: CORS_HEADERS
        }
      )
    }

    // Fetch data from DexTools with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': DEXTOOLS_API_KEY
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      console.warn(`DexTools API returned status ${response.status} for ${type} ${tokenAddress}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`
        }),
        {
          status: response.status === 429 ? 503 : 400, // Service Unavailable for rate limiting
          headers: CORS_HEADERS
        }
      )
    }

    const result = await response.json()
    
    if (result.statusCode === 200 && result.data) {
      // Store in cache
      cache[cacheKey] = {
        data: result.data,
        timestamp: now
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          data: result.data
        }),
        {
          status: 200,
          headers: CORS_HEADERS
        }
      )
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: result.message || 'Unknown error from DexTools API'
      }),
      {
        status: 400,
        headers: CORS_HEADERS
      }
    )
  } catch (error) {
    console.error('Error in getDexToolsInfo:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error'
      }),
      {
        status: 500,
        headers: CORS_HEADERS
      }
    )
  }
})
