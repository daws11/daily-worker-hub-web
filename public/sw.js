// ============================================================================
// Service Worker for Push Notifications
// ============================================================================
// This service worker handles incoming push notifications from the server
// and displays them to users using the Notification API. It also handles
// notification clicks to navigate users to relevant pages.
//
// The service worker runs independently of the web page and can receive
// push notifications even when the app is closed or the browser is minimized.
//
// Events handled:
// - 'push': Receives push notification payload and displays notification
// - 'notificationclick': Handles user clicks on notifications
// ============================================================================

const CACHE_NAME = 'daily-worker-hub-v1'
const urlsToCache = ['/']

// ============================================================================
// Service Worker Installation
// ============================================================================
// Install event: Cache static assets for offline support
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// ============================================================================
// Service Worker Activation
// ============================================================================
// Activate event: Clean up old caches and take control immediately
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// ============================================================================
// Push Event Handler
// ============================================================================
// Receives push notification payload from the server and displays it
// as a browser notification to the user.
//
// Expected payload format:
// {
//   title: string,        // Notification title (required)
//   body: string,         // Notification body text (required)
//   icon?: string,        // URL to notification icon (optional)
//   badge?: string,       // URL to notification badge (optional)
//   image?: string,       // URL to notification image (optional)
//   data?: {              // Custom data attached to notification (optional)
//     url?: string,       // URL to open on click
//     [key: string]: any  // Other custom data
//   },
//   actions?: Array<{     // Action buttons for notification (optional)
//     action: string,     // Action identifier
//     title: string,      // Button label
//     icon?: string       // Button icon URL
//   }>
// }
// ============================================================================
self.addEventListener('push', (event) => {
  try {
    let pushData = {
      title: 'Notifikasi Baru',
      body: 'Ada pesan baru untuk Anda',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {},
    }

    // Parse push data from event
    if (event.data) {
      try {
        const receivedData = event.data.json()
        pushData = { ...pushData, ...receivedData }
      } catch {
        // If data is not JSON, use as text for body
        pushData.body = event.data.text() || pushData.body
      }
    }

    // Prepare notification options
    const notificationOptions = {
      body: pushData.body,
      icon: pushData.icon || '/icon-192.png',
      badge: pushData.badge || '/badge-72.png',
      image: pushData.image,
      data: pushData.data || {},
      vibrate: [200, 100, 200],
      tag: pushData.data.tag || 'default-notification',
      renotify: pushData.data.renotify !== false,
      requireInteraction: pushData.data.requireInteraction || false,
      silent: pushData.data.silent || false,
      timestamp: pushData.data.timestamp || Date.now(),
      actions: pushData.actions || [],
    }

    // Add URL to data for click handling
    if (pushData.data?.url) {
      notificationOptions.data.url = pushData.data.url
    }

    // Show the notification
    event.waitUntil(
      self.registration.showNotification(pushData.title, notificationOptions)
    )
  } catch (error) {
    // Fallback notification if push data parsing fails
    event.waitUntil(
      self.registration.showNotification('Daily Worker Hub', {
        body: 'Anda memiliki notifikasi baru',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
      })
    )
  }
})

// ============================================================================
// Notification Click Event Handler
// ============================================================================
// Handles user clicks on notifications. Opens the associated URL or
// focuses the existing window if already open.
//
// If the notification has a data.url property, navigates to that URL.
// Otherwise, opens the app root.
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/'

  // Handle action button clicks
  if (event.action) {
    const action = event.action

    // Special handling for different actions
    if (action === 'view') {
      return event.waitUntil(
        handleNavigation(urlToOpen)
      )
    } else if (action === 'dismiss') {
      // Just close the notification
      return
    } else {
      // Custom action - add action to URL
      const customUrl = new URL(urlToOpen, self.location.origin)
      customUrl.searchParams.set('action', action)
      return event.waitUntil(
        handleNavigation(customUrl.toString())
      )
    }
  }

  // Default click behavior - navigate to URL
  event.waitUntil(
    handleNavigation(urlToOpen)
  )
})

// ============================================================================
// Navigation Helper
// ============================================================================
// Helper function to handle navigation to a URL. Checks if there's an
// existing window/tab open and focuses it, otherwise opens a new window.
//
// @param {string} url - The URL to navigate to
// ============================================================================
async function handleNavigation(url) {
  // Check if there's an existing window/tab open
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  // Try to find an existing client with the same URL
  const existingClient = allClients.find((client) => {
    const clientUrl = new URL(client.url)
    return clientUrl.origin === self.location.origin
  })

  if (existingClient) {
    // Focus existing window and navigate to URL
    await existingClient.focus()
    await existingClient.navigate(url)
  } else {
    // Open a new window
    await self.clients.openWindow(url)
  }
}

// ============================================================================
// Fetch Event Handler (Offline Support)
// ============================================================================
// Intercepts network requests and serves cached content when offline.
// Provides basic offline support for the app.
// ============================================================================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }

      // Clone the request
      const fetchRequest = event.request.clone()

      // Make network request and cache the response
      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Cache the response for future use
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      }).catch(() => {
        // Return offline fallback if available
        return caches.match('/offline')
      })
    })
  )
})
