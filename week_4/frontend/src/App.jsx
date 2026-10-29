import { useEffect, useMemo, useRef, useState } from 'react'
import products from './data/products.json'

const MAX_PRODUCT_QUANTITY = 4
const currency = (amount) => `$${amount.toFixed(2)}`

function getUserInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getVariantKey(variants) {
  return Object.entries(variants)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join('|')
}

function getProductImage(product, variants) {
  const imageKeys = [
    getVariantKey(variants),
    ...Object.entries(variants).map(([name, value]) => `${name}=${value}`),
  ]
  const image = imageKeys
    .map((key) => product.variantImages?.[key])
    .find(Boolean)

  return image ?? product.image
}

function getColorImageFilter(color, hasVariantImage) {
  if (!color || hasVariantImage) {
    return undefined
  }

  const normalizedColor = color.toLowerCase()
  if (['black', 'charcoal', 'space gray', 'silver'].includes(normalizedColor)) {
    return 'grayscale(0.75) brightness(0.9)'
  }
  if (['blue', 'midnight'].includes(normalizedColor)) {
    return 'sepia(0.25) saturate(1.5) hue-rotate(155deg)'
  }
  if (['green', 'olive', 'sage', 'forest'].includes(normalizedColor)) {
    return 'sepia(0.45) saturate(1.5) hue-rotate(45deg)'
  }
  if (['rose', 'berry', 'coral', 'terracotta', 'clay'].includes(normalizedColor)) {
    return 'sepia(0.5) saturate(1.8) hue-rotate(315deg)'
  }
  if (['amber', 'tortoise'].includes(normalizedColor)) {
    return 'sepia(0.7) saturate(1.5)'
  }
  if (['cream', 'natural', 'sand', 'oat', 'nude', 'ivory'].includes(normalizedColor)) {
    return 'sepia(0.35) saturate(0.8) brightness(1.05)'
  }

  return 'saturate(0.75)'
}

function getVariantStock(product, variants) {
  if (!product.variantStock) {
    return product.stock
  }

  return product.variantStock[getVariantKey(variants)] ?? 0
}

function getRoute() {
  const hash = window.location.hash.slice(1)
  if (hash === 'cart') {
    return { page: 'cart' }
  }

  if (hash === 'login') {
    return { page: 'login' }
  }
  if (hash === 'settings') {
    return { page: 'settings' }
  }
  if (hash === 'checkout') {
    return { page: 'checkout' }
  }
  if (hash === 'order-complete') {
    return { page: 'order-complete' }
  }

  if (hash.startsWith('product/')) {
    return { page: 'product', productId: hash.slice('product/'.length) }
  }

  return { page: 'home' }
}

function App() {
  const [apiStatus, setApiStatus] = useState('Checking the backend...')
  const [cart, setCart] = useState({})
  const [cartMessage, setCartMessage] = useState('')
  const [route, setRoute] = useState(getRoute)
  const [user, setUser] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authReturnRoute, setAuthReturnRoute] = useState({ hash: 'cart', route: { page: 'cart' } })
  const [customerReviews, setCustomerReviews] = useState(() => {
    const savedReviews = window.localStorage.getItem('shopease.customerReviews')
    return savedReviews ? JSON.parse(savedReviews) : []
  })
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [selectedVariants, setSelectedVariants] = useState({})
  const [selectedQuantity, setSelectedQuantity] = useState(1)

  const cartItems = useMemo(
    () => Object.entries(cart).flatMap(([key, line]) => {
      const product = products.find((item) => item.id === line.productId)
      return product ? [{ ...line, key, product }] : []
    }),
    [cart],
  )
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  )
  const discount = 0
  const selectedProduct = route.page === 'product'
    ? products.find((product) => product.id === route.productId)
    : undefined
  const productQuantityInCart = selectedProduct
    ? cartItems
      .filter((item) => item.product.id === selectedProduct.id)
      .reduce((total, item) => total + item.quantity, 0)
    : 0
  const selectedVariantKey = selectedProduct ? getVariantKey(selectedVariants) : ''
  const selectedVariantQuantityInCart = selectedProduct
    ? cartItems
      .filter((item) => item.product.id === selectedProduct.id && getVariantKey(item.variants) === selectedVariantKey)
      .reduce((total, item) => total + item.quantity, 0)
    : 0
  const selectedVariantStock = selectedProduct
    ? getVariantStock(selectedProduct, selectedVariants)
    : 0
  const maxAddableQuantity = selectedProduct
    ? Math.max(
      0,
      Math.min(
        MAX_PRODUCT_QUANTITY - productQuantityInCart,
        selectedVariantStock - selectedVariantQuantityInCart,
      ),
    )
    : 0

  useEffect(() => {
    function syncRoute() {
      setRoute(getRoute())
      setUserMenuOpen(false)
      window.scrollTo({ top: 0 })
    }

    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    function closeMenuOnOutsideClick(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    function closeMenuOnEscape(event) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('click', closeMenuOnOutsideClick)
    document.addEventListener('keydown', closeMenuOnEscape)
    return () => {
      document.removeEventListener('click', closeMenuOnOutsideClick)
      document.removeEventListener('keydown', closeMenuOnEscape)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (response.status === 401) {
          if (active) setUser(null)
          return
        }
        if (!response.ok) {
          throw new Error(`Account request failed (${response.status}).`)
        }

        const result = await response.json()
        if (active) setUser(result.user)
      } catch {
        if (active) {
          setUser(null)
          setAuthError('Could not connect to the account service. Start the backend and try again.')
        }
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    loadCurrentUser()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('shopease.customerReviews', JSON.stringify(customerReviews))
  }, [customerReviews])

  useEffect(() => {
    if (!authLoading && route.page === 'checkout' && !user) {
      setAuthMode('login')
      setAuthError('Sign in before checking out.')
      navigate('login', { page: 'login' })
    }
  }, [authLoading, route.page, user])

  useEffect(() => {
    if (!selectedProduct) {
      return
    }

    setSelectedVariants(
      Object.fromEntries(
        Object.entries(selectedProduct.variants ?? {}).map(([name, options]) => [name, options[0]]),
      ),
    )
    setSelectedQuantity(1)
  }, [selectedProduct?.id])

  useEffect(() => {
    let active = true

    async function checkApi() {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`)
        }

        const health = await response.json()
        if (active) {
          setApiStatus(`Backend connected · Database ${health.database}`)
        }
      } catch {
        if (active) {
          setApiStatus('Backend unavailable · Start the backend to connect')
        }
      }
    }

    checkApi()
    return () => {
      active = false
    }
  }, [])

  function navigate(hash, nextRoute) {
    window.history.pushState(null, '', `#${hash}`)
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthBusy(true)

    try {
      const endpoint = authMode === 'signup' ? 'register' : 'login'
      const payload = {
        email: authEmail,
        password: authPassword,
        ...(authMode === 'signup' ? { name: authName } : {}),
      }
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = response.status === 204 ? {} : await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Unable to sign in. Please try again.')
      }

      setUser(result.user)
      setAuthPassword('')
      setAuthError('')
      navigate(authReturnRoute.hash, authReturnRoute.route)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function signOut() {
    setAuthError('')
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Sign out failed (${response.status}).`)
      }

      setUser(null)
      setUserMenuOpen(false)
      navigate('home', { page: 'home' })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }

  function submitReview(event, product) {
    event.preventDefault()
    const comment = reviewComment.trim()
    if (!user || comment.length < 5) {
      setReviewMessage('Please write a comment with at least 5 characters.')
      return
    }

    const nextReview = {
      productId: product.id,
      name: user.name,
      rating: Number(reviewRating),
      comment,
      date: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }
    setCustomerReviews((current) => [...current, nextReview])
    setReviewComment('')
    setReviewMessage('Your feedback has been added on this browser.')
  }

  function startCheckout() {
    if (!user) {
      setAuthMode('login')
      setAuthReturnRoute({ hash: 'cart', route: { page: 'cart' } })
      setAuthError('Sign in to continue to checkout.')
      navigate('login', { page: 'login' })
      return
    }

    navigate('checkout', { page: 'checkout' })
  }

  function completeDemoOrder() {
    setCart({})
    navigate('order-complete', { page: 'order-complete' })
  }

  function showSection(sectionId) {
    navigate('home', { page: 'home' })
    if (sectionId === 'home') {
      return
    }

    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  function addToCart(product, variants, quantity) {
    const variantKey = getVariantKey(variants)
    const key = `${product.id}${variantKey ? `::${variantKey}` : ''}`
    const currentProductQuantity = cartItems
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0)
    const currentVariantQuantity = cartItems
      .filter((item) => item.product.id === product.id && getVariantKey(item.variants) === variantKey)
      .reduce((total, item) => total + item.quantity, 0)
    const variantStock = getVariantStock(product, variants)
    const allowedQuantity = Math.min(
      MAX_PRODUCT_QUANTITY - currentProductQuantity,
      variantStock - currentVariantQuantity,
    )
    const quantityToAdd = Math.min(quantity, allowedQuantity)

    if (quantityToAdd <= 0) {
      setCartMessage(
        variantStock - currentVariantQuantity <= 0
          ? 'This variant is out of stock.'
          : `You can add up to ${MAX_PRODUCT_QUANTITY} of this product across all variants.`,
      )
      return
    }

    setCart((currentCart) => ({
      ...currentCart,
      [key]: {
        productId: product.id,
        variants,
        quantity: (currentCart[key]?.quantity ?? 0) + quantityToAdd,
      },
    }))
    setCartMessage(`${quantityToAdd} ${product.name} added to your cart.`)
    navigate('cart', { page: 'cart' })
  }

  function removeFromCart(key) {
    setCart((currentCart) => {
      const { [key]: removedLine, ...remainingCart } = currentCart
      return remainingCart
    })
  }

  function renderHeader() {
    return (
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => showSection('home')} aria-label="ShopEase home">
          shop<span>ease</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-link ${route.page === 'home' ? 'active' : ''}`} type="button" onClick={() => showSection('home')}>Home</button>
          <button className="nav-link" type="button" onClick={() => showSection('about-us')}>About Us</button>
          <button className="nav-link" type="button" onClick={() => showSection('contact-us')}>Contact Us</button>
        </nav>
        <div className="header-actions">
          <button
            className="cart-button"
            type="button"
            onClick={() => navigate('cart', { page: 'cart' })}
            aria-label={`Shopping cart: ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`}
            title={`${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'} in cart`}
          >
            <span className="cart-icon-wrap">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="cart-count" aria-live="polite">{cartItemCount}</span>
            </span>
            <span>Cart</span>
          </button>
          <div className="account-controls" ref={userMenuRef}>
            <button
              className="profile-button"
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthMode('login')
                  setAuthError('')
                  navigate('login', { page: 'login' })
                } else {
                  setUserMenuOpen((isOpen) => !isOpen)
                }
              }}
              aria-label={user ? `Hi, ${user.name}` : 'Sign in to your account'}
              aria-expanded={Boolean(user && userMenuOpen)}
              aria-haspopup={user ? 'menu' : undefined}
            >
              <span className="profile-avatar" aria-hidden="true">
                {user ? getUserInitials(user.name) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.3" />
                    <path d="M5.5 20c.5-3.5 2.7-5.3 6.5-5.3s6 1.8 6.5 5.3" />
                  </svg>
                )}
              </span>
              <span className="account-greeting">Hi, {user?.name ?? 'Guest'}</span>
            </button>
            {user && userMenuOpen && (
              <div className="profile-menu" role="menu" aria-label="User menu">
                <div className="profile-menu-user">
                  <span className="profile-menu-name">{user.name}</span>
                  <span className="profile-menu-email">{user.email}</span>
                </div>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('settings', { page: 'settings' })
                  }}
                >
                  <span aria-hidden="true">⚙</span> Settings
                </button>
                <button
                  className="profile-menu-item logout-item"
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                >
                  <span aria-hidden="true">↪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    )
  }

  function renderCart() {
    return (
      <section className="cart-page" aria-labelledby="cart-title">
        <div className="cart-page-heading">
          <div>
            <p className="eyebrow">YOUR SHOPPING BAG</p>
            <h1 id="cart-title">Shopping cart</h1>
            <p className="intro">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in your cart</p>
          </div>
          <button className="continue-shopping" type="button" onClick={() => showSection('home')}>
            <span aria-hidden="true">←</span> Continue shopping
          </button>
        </div>

        {cartItems.length > 0 ? (
          <>
            <div className="cart-table-wrap">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Item price</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Total amount</th>
                    <th scope="col"><span className="visually-hidden">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.key}>
                      <th className="cart-product-name" scope="row">
                        <img
                          src={getProductImage(item.product, item.variants)}
                          alt=""
                          style={{
                            filter: getColorImageFilter(item.variants.Color, Boolean(item.product.variantImages?.[`Color=${item.variants.Color}`])),
                          }}
                        />
                        <span>
                          {item.product.name}
                          {Object.entries(item.variants).length > 0 && (
                            <span className="cart-variant">
                              {Object.entries(item.variants).map(([name, value]) => `${name}: ${value}`).join(' · ')}
                            </span>
                          )}
                        </span>
                      </th>
                      <td data-label="Item price">{currency(item.product.price)}</td>
                      <td data-label="Quantity">{item.quantity}</td>
                      <td className="cart-line-total" data-label="Total amount">
                        {currency(item.product.price * item.quantity)}
                      </td>
                      <td className="cart-remove-cell">
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          aria-label={`Remove ${item.product.name} from cart`}
                          title={`Remove ${item.product.name}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{currency(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span>−{currency(discount)}</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total amount</span>
                <span>{currency(subtotal - discount)}</span>
              </div>
              <button className="add-button checkout-button" type="button" onClick={startCheckout}>
                Continue to checkout
              </button>
            </div>
          </>
        ) : (
          <div className="empty-cart">
            <div className="empty-cart-icon" aria-hidden="true">♡</div>
            <h2>Your cart is empty</h2>
            <p>Find something you love and it will show up here.</p>
            <button className="add-button" type="button" onClick={() => showSection('home')}>
              Browse products
            </button>
          </div>
        )}
      </section>
    )
  }

  function renderHome() {
    return (
      <>
        <section className="shop-heading" aria-labelledby="shop-title">
          <div>
            <p className="eyebrow">THOUGHTFUL PICKS, EVERYDAY</p>
            <h1 id="shop-title">Find your next favorite.</h1>
            <p className="intro">Good things for your home, your routine, and everything in between.</p>
          </div>
          <a className="collection-link" href="#products">
            Shop all products <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section className="products-section" id="products" aria-labelledby="products-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE SHOP</p>
              <h2 id="products-title">Our products</h2>
            </div>
            <span className="product-total">{products.length} items</span>
          </div>

          <div className="product-grid">
            {products.map((product) => {
              const quantityInCart = cartItems
                .filter((item) => item.product.id === product.id)
                .reduce((total, item) => total + item.quantity, 0)
              const availableStock = product.stock - quantityInCart

              return (
                <article className="product-card" key={product.id}>
                  <button
                    className="product-image-link"
                    type="button"
                    onClick={() => navigate(`product/${product.id}`, { page: 'product', productId: product.id })}
                    aria-label={`View ${product.name}`}
                  >
                    <div className="product-image-wrap">
                      <img className="product-image" src={product.image} alt="" />
                      {product.badge && <span className="product-badge">{product.badge}</span>}
                    </div>
                  </button>
                  <div className="product-details">
                    <div className="product-name-row">
                      <button
                        className="product-title-link"
                        type="button"
                        onClick={() => navigate(`product/${product.id}`, { page: 'product', productId: product.id })}
                      >
                        {product.name}
                      </button>
                      <span className="rating" aria-label={`Rated ${product.rating} out of 5`}>
                        <span aria-hidden="true">★</span> {product.rating}
                      </span>
                    </div>
                    <p className="product-category">{product.category}</p>
                    <div className="product-buy-row">
                      <div>
                        <p className="product-price">{currency(product.price)}</p>
                        <p className={`stock ${availableStock === 0 ? 'out-of-stock' : ''}`}>
                          {availableStock > 0 ? `${availableStock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                      <button
                        className="add-button"
                        type="button"
                        onClick={() => navigate(`product/${product.id}`, { page: 'product', productId: product.id })}
                      >
                        View details
                      </button>
                    </div>
                    {quantityInCart > 0 && (
                      <p className="cart-item-note">In your cart: {quantityInCart}</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <p className="cart-message" role="status" aria-live="polite">{cartMessage}</p>
        </section>

        <section className="info-section" id="about-us">
          <div>
            <p className="eyebrow">A LITTLE ABOUT US</p>
            <h2>Everyday essentials, picked with care.</h2>
          </div>
          <p>
            ShopEase is a growing collection of useful, well-loved finds. We are
            building a simple place to discover products that make everyday life
            a little better.
          </p>
        </section>

        <section className="contact-section" id="contact-us">
          <div>
            <p className="eyebrow">WE’RE HERE TO HELP</p>
            <h2>Have a question?</h2>
          </div>
          <a href="mailto:hello@shopease.example">hello@shopease.example</a>
        </section>
      </>
    )
  }

  function renderProductDetails() {
    if (!selectedProduct) {
      return (
        <section className="product-not-found">
          <h1>Product not found</h1>
          <p>This product may have been removed from the catalog.</p>
          <button className="add-button" type="button" onClick={() => showSection('home')}>Back to products</button>
        </section>
      )
    }

    const reviews = [
      ...(selectedProduct.reviews ?? []),
      ...customerReviews.filter((review) => review.productId === selectedProduct.id),
    ]
    const variants = Object.entries(selectedProduct.variants ?? {})
    const variantInStock = selectedVariantStock > selectedVariantQuantityInCart
    const colorVariant = selectedVariants.Color
    const selectedImage = getProductImage(selectedProduct, selectedVariants)
    const hasColorImage = Boolean(selectedProduct.variantImages?.[`Color=${colorVariant}`])
    const averageRating = reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : selectedProduct.rating

    return (
      <section className="product-page" aria-labelledby="detail-title">
        <button className="continue-shopping" type="button" onClick={() => showSection('home')}>
          <span aria-hidden="true">←</span> Back to products
        </button>
        <div className="product-detail-layout">
          <div className="detail-image-wrap">
            <img
              className="detail-image"
              src={selectedImage}
              alt={`${selectedProduct.name}${colorVariant ? ` in ${colorVariant}` : ''}`}
              style={{ filter: getColorImageFilter(colorVariant, hasColorImage) }}
            />
            {selectedProduct.badge && <span className="product-badge">{selectedProduct.badge}</span>}
          </div>
          <div className="detail-information">
            <p className="eyebrow">{selectedProduct.category}</p>
            <h1 id="detail-title">{selectedProduct.name}</h1>
            <div className="detail-rating">
              <span className="rating-star" aria-hidden="true">★</span>
              <strong>{averageRating.toFixed(1)}</strong>
              <span>({reviews.length} customer {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </div>
            <p className="detail-price">{currency(selectedProduct.price)}</p>
            <p className="detail-stock">
              {variantInStock
                ? `${selectedVariantStock - selectedVariantQuantityInCart} in stock for this selection`
                : 'Out of stock'}
            </p>

            {variants.map(([name, options]) => (
              <fieldset className="variant-fieldset" key={name}>
                <legend>{name} <span>{selectedVariants[name]}</span></legend>
                <div className="variant-options">
                  {options.map((option) => (
                    <button
                      className={`variant-option ${selectedVariants[name] === option ? 'selected' : ''}`}
                      key={option}
                      type="button"
                      aria-pressed={selectedVariants[name] === option}
                      onClick={() => setSelectedVariants((current) => ({ ...current, [name]: option }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="detail-add-row">
              <label className="quantity-label" htmlFor="product-quantity">Quantity</label>
              <select
                id="product-quantity"
                value={maxAddableQuantity === 0 ? '' : Math.min(selectedQuantity, maxAddableQuantity)}
                onChange={(event) => setSelectedQuantity(Number(event.target.value))}
                disabled={maxAddableQuantity === 0}
              >
                {maxAddableQuantity === 0
                  ? <option value="">Unavailable</option>
                  : Array.from({ length: maxAddableQuantity }, (_, index) => index + 1).map((quantity) => (
                    <option key={quantity} value={quantity}>{quantity}</option>
                  ))}
              </select>
              <button
                className="add-button detail-add-button"
                type="button"
                disabled={maxAddableQuantity === 0}
                onClick={() => addToCart(selectedProduct, selectedVariants, selectedQuantity)}
              >
                {maxAddableQuantity === 0 ? 'Limit reached' : 'Add to cart'}
              </button>
            </div>
            <p className="quantity-help">
              Maximum {MAX_PRODUCT_QUANTITY} of this product per customer. Stock is tracked for each selected variant combination.
            </p>
            <p className="cart-message" role="status" aria-live="polite">{cartMessage}</p>
          </div>
        </div>

        <section className="description-section" aria-labelledby="description-title">
          <p className="eyebrow">GET TO KNOW IT</p>
          <h2 id="description-title">Product description</h2>
          <p>{selectedProduct.description}</p>
        </section>

        <section className="reviews-section" aria-labelledby="reviews-title">
          <div className="reviews-heading">
            <div>
              <p className="eyebrow">WHAT CUSTOMERS SAY</p>
              <h2 id="reviews-title">Customer feedback</h2>
            </div>
            <span className="review-summary">
              <span className="rating-star" aria-hidden="true">★</span> {averageRating.toFixed(1)} out of 5
            </span>
          </div>
          {reviews.length > 0 ? (
            <div className="review-list">
              {reviews.map((review, index) => (
                <article className="review-card" key={`${review.name}-${index}`}>
                  <div className="review-card-heading">
                    <h3>{review.name}</h3>
                    <span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p>{review.comment}</p>
                  <time>{review.date}</time>
                </article>
              ))}
            </div>
          ) : (
            <p className="no-reviews">No customer feedback yet. Be the first to share your experience.</p>
          )}
          {user ? (
            <form className="review-form" onSubmit={(event) => submitReview(event, selectedProduct)}>
              <h3>Leave your feedback</h3>
              <label htmlFor="review-rating">Your rating</label>
              <select
                id="review-rating"
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>
                ))}
              </select>
              <label htmlFor="review-comment">Your comment</label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                minLength={5}
                maxLength={1000}
                rows={4}
                required
                placeholder="Share your experience with this product"
              />
              <button className="add-button" type="submit">Post feedback</button>
              <p className="cart-message" role="status">{reviewMessage}</p>
            </form>
          ) : (
            <div className="review-sign-in">
              <p>Sign in to leave a rating and comment.</p>
              <button
                className="continue-shopping"
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthReturnRoute({
                    hash: `product/${selectedProduct.id}`,
                    route: { page: 'product', productId: selectedProduct.id },
                  })
                  setAuthError('')
                  navigate('login', { page: 'login' })
                }}
              >
                Sign in to leave feedback
              </button>
            </div>
          )}
        </section>
      </section>
    )
  }

  function renderAuth() {
    return (
      <section className="auth-page" aria-labelledby="auth-title">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO SHÓPEASE</p>
          <h1 id="auth-title">{authMode === 'signup' ? 'Create your account' : 'Sign in'}</h1>
          <p className="intro">
            {authMode === 'signup'
              ? 'Create an account to continue with your order and share product feedback.'
              : 'Sign in to continue to your cart and checkout.'}
          </p>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button
              className={`auth-tab ${authMode === 'login' ? 'selected' : ''}`}
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => { setAuthMode('login'); setAuthError('') }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${authMode === 'signup' ? 'selected' : ''}`}
              type="button"
              role="tab"
              aria-selected={authMode === 'signup'}
              onClick={() => { setAuthMode('signup'); setAuthError('') }}
            >
              Sign up
            </button>
          </div>
          {user ? (
            <div className="signed-in-notice">
              <p>You are signed in as {user.email}.</p>
              <button className="add-button" type="button" onClick={() => navigate('cart', { page: 'cart' })}>
                Return to cart
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === 'signup' && (
                <>
                  <label htmlFor="auth-name">Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    autoComplete="name"
                    minLength={2}
                    maxLength={60}
                    required
                  />
                </>
              )}
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
              />
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                maxLength={128}
                required
              />
              {authMode === 'signup' && (
                <p className="form-hint">Use a password between 8 and 128 characters.</p>
              )}
              {authError && <p className="form-error" role="alert">{authError}</p>}
              <button className="add-button auth-submit" type="submit" disabled={authBusy || authLoading}>
                {authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </section>
    )
  }

  function renderCheckout() {
    return (
      <section className="checkout-page" aria-labelledby="checkout-title">
        <p className="eyebrow">DEMO CHECKOUT</p>
        <h1 id="checkout-title">Payment</h1>
        <p className="intro">This is a demo payment flow. No payment details are requested or charged.</p>
        <div className="checkout-layout">
          <div className="demo-payment-card">
            <h2>Payment method</h2>
            <div className="demo-payment-option">
              <span className="demo-radio" aria-hidden="true" />
              <div>
                <strong>Demo payment</strong>
                <p>Sandbox order confirmation only</p>
              </div>
            </div>
            <p className="demo-payment-notice">
              This project is not connected to a payment provider. Do not enter
              card or bank information.
            </p>
            <button
              className="add-button checkout-submit"
              type="button"
              disabled={cartItems.length === 0}
              onClick={completeDemoOrder}
            >
              Place demo order
            </button>
          </div>
          <div className="checkout-order-summary">
            <h2>Order summary</h2>
            {cartItems.map((item) => (
              <div className="checkout-order-item" key={item.key}>
                <span>{item.product.name} × {item.quantity}</span>
                <strong>{currency(item.product.price * item.quantity)}</strong>
              </div>
            ))}
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <span>−{currency(discount)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total amount</span>
              <span>{currency(subtotal - discount)}</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  function renderOrderComplete() {
    return (
      <section className="order-complete-page" aria-labelledby="order-complete-title">
        <div className="order-complete-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">DEMO ORDER</p>
        <h1 id="order-complete-title">Order complete</h1>
        <p>This demo order was completed without processing a payment.</p>
        <button className="add-button" type="button" onClick={() => showSection('home')}>
          Continue shopping
        </button>
      </section>
    )
  }

  function renderSettings() {
    return (
      <section className="settings-page" aria-labelledby="settings-title">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 id="settings-title">Settings</h1>
        {user ? (
          <div className="settings-card">
            <div className="settings-avatar" aria-hidden="true">{getUserInitials(user.name)}</div>
            <div>
              <p className="settings-label">Name</p>
              <p className="settings-value">{user.name}</p>
            </div>
            <div>
              <p className="settings-label">Email</p>
              <p className="settings-value">{user.email}</p>
            </div>
          </div>
        ) : (
          <p className="intro">Sign in to view your account settings.</p>
        )}
        <button className="continue-shopping" type="button" onClick={() => showSection('home')}>
          <span aria-hidden="true">←</span> Back to shopping
        </button>
      </section>
    )
  }

  return (
    <main className="page-shell" id="home">
      {renderHeader()}
      {route.page === 'cart'
        ? renderCart()
        : route.page === 'login'
          ? renderAuth()
          : route.page === 'checkout'
            ? renderCheckout()
            : route.page === 'order-complete'
              ? renderOrderComplete()
              : route.page === 'settings'
                ? renderSettings()
        : route.page === 'product'
          ? renderProductDetails()
          : renderHome()}
      <footer className="status-bar">
        <span className="status-dot" aria-hidden="true" />
        <p role="status">{apiStatus}</p>
        <span className="footer-copy">© ShopEase</span>
      </footer>
    </main>
  )
}

export default App
