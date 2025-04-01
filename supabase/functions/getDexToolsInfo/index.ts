
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEXTOOLS_API_KEY = 'XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey, X-API-KEY',
  'Content-Type': 'application/json'
}

// Memory cache to avoid excessive API calls
const cache: Record<string, { data: any, timestamp: number }> = {}
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 8, // Maximum requests per window
  windowMs: 60 * 1000, // 1 minute window
  requestCount: 0,
  windowStart: Date.now(),
  queue: [] as { resolve: (value: any) => void, tokenAddress: string, chain: string, type: string }[]
}

// Check if we're rate limited
const isRateLimited = (): boolean => {
  const now = Date.now()
  
  // Reset window if needed
  if (now - RATE_LIMIT.windowStart > RATE_LIMIT.windowMs) {
    RATE_LIMIT.requestCount = 0
    RATE_LIMIT.windowStart = now
    return false
  }
  
  // Check if we've hit the limit
  return RATE_LIMIT.requestCount >= RATE_LIMIT.maxRequests
}

// Increment the rate limit counter
const incrementRateLimit = (): void => {
  RATE_LIMIT.requestCount++
  console.log(`Rate limit: ${RATE_LIMIT.requestCount}/${RATE_LIMIT.maxRequests} requests in current window`)
}

// Process the rate limit queue
const processQueue = async () => {
  if (RATE_LIMIT.queue.length === 0) return
  
  // If we're still rate limited, schedule checking again later
  if (isRateLimited()) {
    setTimeout(processQueue, 1000)
    return
  }
  
  // Process one item from the queue
  const item = RATE_LIMIT.queue.shift()
  if (item) {
    try {
      const { tokenAddress, chain, type } = item
      const cacheKey = `${chain}-${tokenAddress}-${type}`
      
      // Check if we have it in cache now (might have been added while in queue)
      if (cache[cacheKey]) {
        item.resolve({
          success: true,
          data: cache[cacheKey].data,
          notice: 'Data was retrieved from cache while request was queued'
        })
        return
      }
      
      // Make the actual API call
      incrementRateLimit()
      const result = await fetchFromDexTools(tokenAddress, chain, type)
      item.resolve(result)
    } catch (err) {
      console.error('Error processing queued request:', err)
      item.resolve({
        success: false,
        error: 'Error processing queued request'
      })
    }
    
    // Schedule processing the next item with a delay
    setTimeout(processQueue, 500)
  }
}

// Fetch data from DexTools API
const fetchFromDexTools = async (tokenAddress: string, chain: string, type: string) => {
  const url = type === 'token'
    ? `https://public-api.dextools.io/trial/v2/token/${chain}/${tokenAddress}`
    : `https://public-api.dextools.io/trial/v2/token/${chain}/${tokenAddress}/price`
  
  const cacheKey = `${chain}-${tokenAddress}-${type}`
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': DEXTOOLS_API_KEY
      },
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limited by DexTools API for ${tokenAddress}`)
      } else {
        console.warn(`DexTools API error ${response.status} for ${tokenAddress}`)
      }
      
      if (cache[cacheKey]) {
        return {
          success: true,
          data: cache[cacheKey].data,
          notice: 'Using cached data due to API error'
        }
      }
      
      return {
        success: false,
        error: `API Error: ${response.status} ${response.statusText}`
      }
    }
    
    const result = await response.json()
    
    if (result.statusCode === 200 && result.data) {
      // Store in cache
      cache[cacheKey] = {
        data: result.data,
        timestamp: Date.now()
      }
      
      return {
        success: true,
        data: result.data
      }
    }
    
    return {
      success: false,
      error: result.message || 'Unknown error from DexTools API'
    }
  } catch (error) {
    console.error(`Fetch error for ${tokenAddress}:`, error)
    
    if (cache[cacheKey]) {
      return {
        success: true,
        data: cache[cacheKey].data,
        notice: 'Using cached data due to fetch error'
      }
    }
    
    return {
      success: false,
      error: error.message || 'Failed to fetch from DexTools API'
    }
  }
}

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

    // If rate limited, add to queue or return stale cache
    if (isRateLimited()) {
      console.log(`Rate limited request for ${tokenAddress}, type: ${type}`)
      
      // If we have cached data (even if expired), use that
      if (cache[cacheKey]) {
        console.log(`Returning stale cache for ${cacheKey} due to rate limiting`)
        return new Response(
          JSON.stringify({
            success: true,
            data: cache[cacheKey].data,
            notice: 'Using cached data due to rate limiting'
          }),
          {
            status: 200,
            headers: CORS_HEADERS
          }
        )
      }
      
      // If we have fewer than 10 items in the queue, add this request to the queue
      if (RATE_LIMIT.queue.length < 10) {
        console.log(`Adding request for ${tokenAddress} to queue (${RATE_LIMIT.queue.length + 1} items)`)
        
        // Create a promise that will be resolved when the queue processor handles this request
        const resultPromise = new Promise(resolve => {
          RATE_LIMIT.queue.push({ resolve, tokenAddress, chain, type })
          
          // Start queue processing if not already started
          if (RATE_LIMIT.queue.length === 1) {
            setTimeout(processQueue, 1000)
          }
        })
        
        const result = await resultPromise
        return new Response(
          JSON.stringify(result),
          {
            status: 200,
            headers: CORS_HEADERS
          }
        )
      }
      
      // Queue is full, return error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded and queue is full. Please try again later.'
        }),
        {
          status: 429, // Too Many Requests
          headers: {
            ...CORS_HEADERS,
            'Retry-After': '60' // Suggest retrying after 60 seconds
          }
        }
      )
    }

    // Not rate limited, make the request
    incrementRateLimit()
    const result = await fetchFromDexTools(tokenAddress, chain, type)
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
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
