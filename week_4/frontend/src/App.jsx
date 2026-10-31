import { useEffect, useMemo, useRef, useState } from "react";
import products from "./data/products.json";

const MAX_PRODUCT_QUANTITY = 4;
const PRODUCTS_PER_PAGE = 9;
const currency = (amount) => `$${amount.toFixed(2)}`;

function getUserInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getVariantKey(variants) {
  return Object.entries(variants)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("|");
}

function getProductImage(product, variants) {
  const imageKeys = [
    getVariantKey(variants),
    ...Object.entries(variants).map(([name, value]) => `${name}=${value}`),
  ];
  const image = imageKeys
    .map((key) => product.variantImages?.[key])
    .find(Boolean);

  return image ?? product.image;
}

function getColorImageFilter(color, hasVariantImage) {
  if (!color || hasVariantImage) {
    return undefined;
  }

  const normalizedColor = color.toLowerCase();
  if (["black", "charcoal", "space gray", "silver"].includes(normalizedColor)) {
    return "grayscale(0.75) brightness(0.9)";
  }
  if (["blue", "midnight"].includes(normalizedColor)) {
    return "sepia(0.25) saturate(1.5) hue-rotate(155deg)";
  }
  if (["green", "olive", "sage", "forest"].includes(normalizedColor)) {
    return "sepia(0.45) saturate(1.5) hue-rotate(45deg)";
  }
  if (
    ["rose", "berry", "coral", "terracotta", "clay"].includes(normalizedColor)
  ) {
    return "sepia(0.5) saturate(1.8) hue-rotate(315deg)";
  }
  if (["amber", "tortoise"].includes(normalizedColor)) {
    return "sepia(0.7) saturate(1.5)";
  }
  if (
    ["cream", "natural", "sand", "oat", "nude", "ivory"].includes(
      normalizedColor,
    )
  ) {
    return "sepia(0.35) saturate(0.8) brightness(1.05)";
  }

  return "saturate(0.75)";
}

function getVariantStock(product, variants) {
  if (!product.variantStock) {
    return product.stock;
  }

  return product.variantStock[getVariantKey(variants)] ?? 0;
}

function getProductReviews(product, customerReviews) {
  return [
    ...(product.reviews ?? []),
    ...customerReviews.filter((review) => review.productId === product.id),
  ];
}

function getAverageRating(reviews) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
  );
}

function getPaginationItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const firstPage = Math.max(1, currentPage - 3);
  const lastPage = Math.min(totalPages, currentPage + 3);
  return Array.from(
    { length: lastPage - firstPage + 1 },
    (_, index) => firstPage + index,
  );
}

function getRoute() {
  const hash = window.location.hash.slice(1);
  if (hash === "cart") {
    return { page: "cart" };
  }

  if (hash === "login") {
    return { page: "login" };
  }
  if (hash === "phone-verification") {
    return { page: "phone-verification" };
  }
  if (hash === "profile") {
    return { page: "profile" };
  }
  if (hash === "settings") {
    return { page: "settings" };
  }
  if (hash === "checkout") {
    return { page: "checkout" };
  }
  if (hash === "order-complete") {
    return { page: "order-complete" };
  }

  if (hash.startsWith("product/")) {
    return { page: "product", productId: hash.slice("product/".length) };
  }

  return { page: "home" };
}

function App() {
  const [apiStatus, setApiStatus] = useState("Checking the backend...");
  const [cart, setCart] = useState({});
  const [cartMessage, setCartMessage] = useState("");
  const [route, setRoute] = useState(getRoute);
  const [productPage, setProductPage] = useState(1);
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [supportMenuOpen, setSupportMenuOpen] = useState(false);
  const supportMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);
  const [authConfirmPasswordVisible, setAuthConfirmPasswordVisible] =
    useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authReturnRoute, setAuthReturnRoute] = useState({
    hash: "cart",
    route: { page: "cart" },
  });
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [developmentPhoneCode, setDevelopmentPhoneCode] = useState("");
  const [phoneOtpExpiresAt, setPhoneOtpExpiresAt] = useState(0);
  const [phoneOtpResendAt, setPhoneOtpResendAt] = useState(0);
  const [phoneOtpRemainingSeconds, setPhoneOtpRemainingSeconds] = useState(0);
  const [phoneOtpResendSeconds, setPhoneOtpResendSeconds] = useState(0);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [customerReviews, setCustomerReviews] = useState(() => {
    const savedReviews = window.localStorage.getItem(
      "shopease.customerReviews",
    );
    return savedReviews ? JSON.parse(savedReviews) : [];
  });
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const cartItems = useMemo(
    () =>
      Object.entries(cart).flatMap(([key, line]) => {
        const product = products.find((item) => item.id === line.productId);
        return product ? [{ ...line, key, product }] : [];
      }),
    [cart],
  );
  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const subtotal = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const discount = 0;
  const pageCount = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const paginationItems = getPaginationItems(pageCount, productPage);
  const visibleProducts = products.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE,
  );
  const selectedProduct =
    route.page === "product"
      ? products.find((product) => product.id === route.productId)
      : undefined;
  const productQuantityInCart = selectedProduct
    ? cartItems
        .filter((item) => item.product.id === selectedProduct.id)
        .reduce((total, item) => total + item.quantity, 0)
    : 0;
  const selectedVariantKey = selectedProduct
    ? getVariantKey(selectedVariants)
    : "";
  const selectedVariantQuantityInCart = selectedProduct
    ? cartItems
        .filter(
          (item) =>
            item.product.id === selectedProduct.id &&
            getVariantKey(item.variants) === selectedVariantKey,
        )
        .reduce((total, item) => total + item.quantity, 0)
    : 0;
  const selectedVariantStock = selectedProduct
    ? getVariantStock(selectedProduct, selectedVariants)
    : 0;
  const maxAddableQuantity = selectedProduct
    ? Math.max(
        0,
        Math.min(
          MAX_PRODUCT_QUANTITY - productQuantityInCart,
          selectedVariantStock - selectedVariantQuantityInCart,
        ),
      )
    : 0;

  useEffect(() => {
    function syncRoute() {
      setRoute(getRoute());
      setUserMenuOpen(false);
      setSupportMenuOpen(false);
      window.scrollTo({ top: 0 });
    }

    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    function closeMenuOnOutsideClick(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (!supportMenuRef.current?.contains(event.target)) {
        setSupportMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setSupportMenuOpen(false);
      }
    }

    document.addEventListener("click", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("click", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.status === 401) {
          if (active) setUser(null);
          return;
        }
        if (!response.ok) {
          throw new Error(`Account request failed (${response.status}).`);
        }

        const result = await response.json();
        if (active) {
          setUser(result.user);
          setProfilePhone(result.user.phone ?? "");
          setProfileAddress(result.user.shippingAddress ?? "");
        }
      } catch {
        if (active) {
          setUser(null);
          setAuthError(
            "Could not connect to the account service. Start the backend and try again.",
          );
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (route.page !== "phone-verification") {
      return undefined;
    }

    function updateRemainingTime() {
      setPhoneOtpRemainingSeconds(
        Math.max(0, Math.ceil((phoneOtpExpiresAt - Date.now()) / 1000)),
      );
      setPhoneOtpResendSeconds(
        Math.max(0, Math.ceil((phoneOtpResendAt - Date.now()) / 1000)),
      );
    }

    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(timerId);
  }, [phoneOtpExpiresAt, phoneOtpResendAt, route.page]);

  useEffect(() => {
    window.localStorage.setItem(
      "shopease.customerReviews",
      JSON.stringify(customerReviews),
    );
  }, [customerReviews]);

  useEffect(() => {
    if (!authLoading && route.page === "checkout" && !user) {
      setAuthMode("login");
      setAuthError("Sign in before checking out.");
      navigate("login", { page: "login" });
    }
  }, [authLoading, route.page, user]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    if (!user.phoneVerified && route.page !== "phone-verification") {
      navigate("phone-verification", { page: "phone-verification" });
    } else if (
      user.phoneVerified &&
      !user.profileComplete &&
      route.page !== "profile"
    ) {
      navigate("profile", { page: "profile" });
    } else if (user.phoneVerified && route.page === "phone-verification") {
      navigate(user.profileComplete ? "home" : "profile", {
        page: user.profileComplete ? "home" : "profile",
      });
    }
  }, [authLoading, route.page, user]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setSelectedVariants(
      Object.fromEntries(
        Object.entries(selectedProduct.variants ?? {}).map(
          ([name, options]) => [name, options[0]],
        ),
      ),
    );
    setSelectedQuantity(1);
  }, [selectedProduct?.id]);

  useEffect(() => {
    let active = true;

    async function checkApi() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const health = await response.json();
        if (active) {
          setApiStatus(`Backend connected · Database ${health.database}`);
        }
      } catch {
        if (active) {
          setApiStatus("Backend unavailable · Start the backend to connect");
        }
      }
    }

    checkApi();
    return () => {
      active = false;
    };
  }, []);

  function navigate(hash, nextRoute) {
    window.history.pushState(null, "", `#${hash}`);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    if (authMode === "signup" && authPassword !== authConfirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthBusy(true);

    try {
      const isSignup = authMode === "signup";
      const response = await fetch(
        `/api/auth/${isSignup ? "register" : "login"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            ...(isSignup
              ? {
                  name: authName,
                  confirmPassword: authConfirmPassword,
                }
              : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || "Unable to sign in. Please try again.",
        );
      }

      if (isSignup) {
        setUser(result.user);
        setProfilePhone("");
        setProfileAddress("");
        setPhoneCodeSent(false);
        setDevelopmentPhoneCode("");
        setPhoneVerificationCode("");
        setAuthPassword("");
        setAuthConfirmPassword("");
        navigate("phone-verification", { page: "phone-verification" });
        return;
      }

      setUser(result.user);
      setProfilePhone(result.user.phone ?? "");
      setProfileAddress(result.user.shippingAddress ?? "");
      setAuthPassword("");
      setAuthError("");
      navigate(
        !result.user.phoneVerified
          ? "phone-verification"
          : result.user.profileComplete
            ? "home"
            : "profile",
        !result.user.phoneVerified
          ? { page: "phone-verification" }
          : result.user.profileComplete
            ? { page: "home" }
            : { page: "profile" },
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPhoneVerificationCode(event) {
    event?.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      const response = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profilePhone }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || "Unable to send a verification code.",
        );
      }

      const expiresAt = Date.now() + result.expiresInSeconds * 1000;
      const resendAt = Date.now() + 60 * 1000;
      setPhoneCodeSent(true);
      setDevelopmentPhoneCode(result.developmentCode ?? "");
      setPhoneOtpExpiresAt(expiresAt);
      setPhoneOtpResendAt(resendAt);
      setPhoneVerificationCode("");
      setAuthError("");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to send a verification code.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitPhoneVerification(event) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      const response = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: phoneVerificationCode }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || "Unable to verify this phone number.",
        );
      }

      setUser(result.user);
      setPhoneCodeSent(false);
      setDevelopmentPhoneCode("");
      setPhoneVerificationCode("");
      setProfilePhone(result.user.phone);
      setAuthError("");
      navigate("profile", { page: "profile" });
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to verify this phone number.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingAddress: profileAddress }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to save your profile.");
      }

      const profileWasAlreadyComplete = user.profileComplete;
      setUser(result.user);
      setAuthError("");
      navigate(
        profileWasAlreadyComplete ? "home" : authReturnRoute.hash,
        profileWasAlreadyComplete ? { page: "home" } : authReturnRoute.route,
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to save your profile.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Sign out failed (${response.status}).`);
      }

      setUser(null);
      setUserMenuOpen(false);
      navigate("home", { page: "home" });
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    }
  }

  function submitReview(event, product) {
    event.preventDefault();
    const comment = reviewComment.trim();
    if (!user || comment.length < 5) {
      setReviewMessage("Please write a comment with at least 5 characters.");
      return;
    }

    const nextReview = {
      productId: product.id,
      name: user.name,
      rating: Number(reviewRating),
      comment,
      date: new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
    setCustomerReviews((current) => [...current, nextReview]);
    setReviewComment("");
    setReviewMessage("Your feedback has been added on this browser.");
  }

  function startCheckout() {
    if (!user) {
      setAuthMode("login");
      setAuthReturnRoute({ hash: "cart", route: { page: "cart" } });
      setAuthError("Sign in to continue to checkout.");
      navigate("login", { page: "login" });
      return;
    }

    navigate("checkout", { page: "checkout" });
  }

  function completeDemoOrder() {
    setCart({});
    navigate("order-complete", { page: "order-complete" });
  }

  function showSection(sectionId) {
    navigate("home", { page: "home" });
    if (sectionId === "home") {
      setProductPage(1);
      return;
    }

    window.setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function showSupportSection(sectionId) {
    setSupportMenuOpen(false);
    showSection(sectionId);
  }

  function changeProductPage(page) {
    setProductPage(page);
    window.setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function addToCart(product, variants, quantity) {
    const variantKey = getVariantKey(variants);
    const key = `${product.id}${variantKey ? `::${variantKey}` : ""}`;
    const currentProductQuantity = cartItems
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);
    const currentVariantQuantity = cartItems
      .filter(
        (item) =>
          item.product.id === product.id &&
          getVariantKey(item.variants) === variantKey,
      )
      .reduce((total, item) => total + item.quantity, 0);
    const variantStock = getVariantStock(product, variants);
    const allowedQuantity = Math.min(
      MAX_PRODUCT_QUANTITY - currentProductQuantity,
      variantStock - currentVariantQuantity,
    );
    const quantityToAdd = Math.min(quantity, allowedQuantity);

    if (quantityToAdd <= 0) {
      setCartMessage(
        variantStock - currentVariantQuantity <= 0
          ? "This variant is out of stock."
          : `You can add up to ${MAX_PRODUCT_QUANTITY} of this product across all variants.`,
      );
      return;
    }

    setCart((currentCart) => ({
      ...currentCart,
      [key]: {
        productId: product.id,
        variants,
        quantity: (currentCart[key]?.quantity ?? 0) + quantityToAdd,
      },
    }));
    setCartMessage(`${quantityToAdd} ${product.name} added to your cart.`);
    navigate("cart", { page: "cart" });
  }

  function removeFromCart(key) {
    setCart((currentCart) => {
      const { [key]: removedLine, ...remainingCart } = currentCart;
      return remainingCart;
    });
  }

  function renderHeader() {
    return (
      <header className="topbar">
        <button
          className="brand brand-button"
          type="button"
          onClick={() => showSection("home")}
          aria-label="ShopEase home"
        >
          shop<span>ease</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={`nav-link ${route.page === "home" ? "active" : ""}`}
            type="button"
            onClick={() => showSection("home")}
          >
            Home
          </button>
          <button
            className="nav-link"
            type="button"
            onClick={() => showSection("about-us")}
          >
            About Us
          </button>
          <button
            className="nav-link"
            type="button"
            onClick={() => showSection("contact-us")}
          >
            Contact Us
          </button>
          <div className="support-nav-item" ref={supportMenuRef}>
            <button
              className="nav-link support-nav-trigger"
              type="button"
              onClick={() => setSupportMenuOpen((isOpen) => !isOpen)}
              aria-expanded={supportMenuOpen}
              aria-haspopup="menu"
            >
              Help &amp; Support
            </button>
            {supportMenuOpen && (
              <div
                className="support-menu"
                role="menu"
                aria-label="Help and support"
              >
                {[
                  ["help-center", "Help Center"],
                  ["contact-customer-care", "Contact Customer Care"],
                  ["shipping-delivery", "Shipping & Delivery"],
                  ["order-help", "Order"],
                  ["payment-help", "Payment"],
                  ["returns-refunds", "Returns & Refunds"],
                ].map(([sectionId, label]) => (
                  <button
                    className="support-menu-item"
                    key={sectionId}
                    type="button"
                    role="menuitem"
                    onClick={() => showSupportSection(sectionId)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="header-actions">
          <button
            className="cart-button"
            type="button"
            onClick={() => navigate("cart", { page: "cart" })}
            aria-label={`Shopping cart: ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
            title={`${cartItemCount} ${cartItemCount === 1 ? "item" : "items"} in cart`}
          >
            <span className="cart-icon-wrap">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="cart-count" aria-live="polite">
                {cartItemCount}
              </span>
            </span>
            <span>Cart</span>
          </button>
          <div className="account-controls" ref={userMenuRef}>
            <button
              className="profile-button"
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthMode("login");
                  setAuthError("");
                  navigate("login", { page: "login" });
                } else {
                  setUserMenuOpen((isOpen) => !isOpen);
                }
              }}
              aria-label={user ? `Hi, ${user.name}` : "Sign in to your account"}
              aria-expanded={Boolean(user && userMenuOpen)}
              aria-haspopup={user ? "menu" : undefined}
            >
              <span className="profile-avatar" aria-hidden="true">
                {user ? (
                  getUserInitials(user.name)
                ) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.3" />
                    <path d="M5.5 20c.5-3.5 2.7-5.3 6.5-5.3s6 1.8 6.5 5.3" />
                  </svg>
                )}
              </span>
              <span className="account-greeting">
                Hi, {user?.name ?? "Guest"}
              </span>
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
                    setUserMenuOpen(false);
                    navigate("profile", { page: "profile" });
                  }}
                >
                  <span aria-hidden="true">◉</span> Profile
                </button>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("settings", { page: "settings" });
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
    );
  }

  function renderCart() {
    return (
      <section className="cart-page" aria-labelledby="cart-title">
        <div className="cart-page-heading">
          <div>
            <p className="eyebrow">YOUR SHOPPING BAG</p>
            <h1 id="cart-title">Shopping cart</h1>
            <p className="intro">
              {cartItemCount} {cartItemCount === 1 ? "item" : "items"} in your
              cart
            </p>
          </div>
          <button
            className="continue-shopping"
            type="button"
            onClick={() => showSection("home")}
          >
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
                    <th scope="col">
                      <span className="visually-hidden">Remove</span>
                    </th>
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
                            filter: getColorImageFilter(
                              item.variants.Color,
                              Boolean(
                                item.product.variantImages?.[
                                  `Color=${item.variants.Color}`
                                ],
                              ),
                            ),
                          }}
                        />
                        <span>
                          {item.product.name}
                          {Object.entries(item.variants).length > 0 && (
                            <span className="cart-variant">
                              {Object.entries(item.variants)
                                .map(([name, value]) => `${name}: ${value}`)
                                .join(" · ")}
                            </span>
                          )}
                        </span>
                      </th>
                      <td data-label="Item price">
                        {currency(item.product.price)}
                      </td>
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
              <button
                className="add-button checkout-button"
                type="button"
                onClick={startCheckout}
              >
                Continue to checkout
              </button>
            </div>
          </>
        ) : (
          <div className="empty-cart">
            <div className="empty-cart-icon" aria-hidden="true">
              ♡
            </div>
            <h2>Your cart is empty</h2>
            <p>Find something you love and it will show up here.</p>
            <button
              className="add-button"
              type="button"
              onClick={() => showSection("home")}
            >
              Browse products
            </button>
          </div>
        )}
      </section>
    );
  }

  function renderHome() {
    return (
      <>
        <section className="shop-heading" aria-labelledby="shop-title">
          <div>
            <p className="eyebrow">THOUGHTFUL PICKS, EVERYDAY</p>
            <h1 id="shop-title">Find your next favorite.</h1>
            <p className="intro">
              Good things for your home, your routine, and everything in
              between.
            </p>
          </div>
          <a className="collection-link" href="#products">
            Shop all products <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section
          className="products-section"
          id="products"
          aria-labelledby="products-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE SHOP</p>
              <h2 id="products-title">Our products</h2>
            </div>
            <span className="product-total">
              Showing {(productPage - 1) * PRODUCTS_PER_PAGE + 1}–
              {Math.min(productPage * PRODUCTS_PER_PAGE, products.length)} of{" "}
              {products.length} products
            </span>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => {
              const reviews = getProductReviews(product, customerReviews);
              const averageRating = getAverageRating(reviews);
              const quantityInCart = cartItems
                .filter((item) => item.product.id === product.id)
                .reduce((total, item) => total + item.quantity, 0);
              const availableStock = product.stock - quantityInCart;

              return (
                <article className="product-card" key={product.id}>
                  <button
                    className="product-image-link"
                    type="button"
                    onClick={() =>
                      navigate(`product/${product.id}`, {
                        page: "product",
                        productId: product.id,
                      })
                    }
                    aria-label={`View ${product.name}`}
                  >
                    <div className="product-image-wrap">
                      <img
                        className="product-image"
                        src={product.image}
                        alt=""
                      />
                      {product.badge && (
                        <span className="product-badge">{product.badge}</span>
                      )}
                    </div>
                  </button>
                  <div className="product-details">
                    <div className="product-name-row">
                      <button
                        className="product-title-link"
                        type="button"
                        onClick={() =>
                          navigate(`product/${product.id}`, {
                            page: "product",
                            productId: product.id,
                          })
                        }
                      >
                        {product.name}
                      </button>
                      <span
                        className="rating"
                        aria-label={
                          averageRating === null
                            ? "No ratings"
                            : `Rated ${averageRating.toFixed(1)} out of 5 from ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`
                        }
                      >
                        {averageRating === null ? (
                          "No ratings"
                        ) : (
                          <>
                            <span aria-hidden="true">★</span>{" "}
                            {averageRating.toFixed(1)} ({reviews.length})
                          </>
                        )}
                      </span>
                    </div>
                    <p className="product-category">{product.category}</p>
                    <div className="product-buy-row">
                      <div>
                        <p className="product-price">
                          {currency(product.price)}
                        </p>
                        <p
                          className={`stock ${availableStock === 0 ? "out-of-stock" : ""}`}
                        >
                          {availableStock > 0
                            ? `${availableStock} in stock`
                            : "Out of stock"}
                        </p>
                      </div>
                      <button
                        className="add-button"
                        type="button"
                        onClick={() =>
                          navigate(`product/${product.id}`, {
                            page: "product",
                            productId: product.id,
                          })
                        }
                      >
                        View details
                      </button>
                    </div>
                    {quantityInCart > 0 && (
                      <p className="cart-item-note">
                        In your cart: {quantityInCart}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <nav className="pagination" aria-label="Product pages">
            {paginationItems[0] > 1 && (
              <button
                className="pagination-arrow"
                type="button"
                onClick={() => changeProductPage(productPage - 1)}
                aria-label="Previous page"
              >
                &lt;
              </button>
            )}
            {paginationItems.map((page) => (
              <button
                className={`pagination-number ${page === productPage ? "current" : ""}`}
                type="button"
                key={page}
                onClick={() => changeProductPage(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === productPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}
            {paginationItems[paginationItems.length - 1] < pageCount && (
              <button
                className="pagination-arrow"
                type="button"
                onClick={() => changeProductPage(productPage + 1)}
                aria-label="Next page"
              >
                &gt;
              </button>
            )}
          </nav>
          <p className="cart-message" role="status" aria-live="polite">
            {cartMessage}
          </p>
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

        <section className="support-section" aria-labelledby="help-center">
          <div className="support-section-heading" id="help-center">
            <p className="eyebrow">HOW CAN WE HELP?</p>
            <h2>Help &amp; Support</h2>
            <p>
              Find answers about your order, delivery, payment, and returns.
            </p>
          </div>
          <div className="support-topic-grid">
            <article className="support-topic" id="contact-customer-care">
              <h3>Contact Customer Care</h3>
              <p>
                Our customer care team can help with questions about ShopEase.
              </p>
              <a href="mailto:hello@shopease.example">hello@shopease.example</a>
            </article>
            <article className="support-topic" id="shipping-delivery">
              <h3>Shipping &amp; Delivery</h3>
              <p>
                For delivery estimates or a shipping update, contact Customer
                Care with your order details.
              </p>
              <button
                className="support-topic-link"
                type="button"
                onClick={() => showSupportSection("contact-customer-care")}
              >
                Contact Customer Care
              </button>
            </article>
            <article className="support-topic" id="order-help">
              <h3>Order</h3>
              <p>
                Checkout is currently a demo and order tracking is not available
                yet. Contact Customer Care if you need help.
              </p>
              <button
                className="support-topic-link"
                type="button"
                onClick={() => showSupportSection("contact-customer-care")}
              >
                Get order help
              </button>
            </article>
            <article className="support-topic" id="payment-help">
              <h3>Payment</h3>
              <p>
                The checkout is for demonstration only. It does not collect
                payment details or charge you.
              </p>
            </article>
            <article className="support-topic" id="returns-refunds">
              <h3>Returns &amp; Refunds</h3>
              <p>
                For return or refund questions, please contact Customer Care. A
                self-service returns policy is not configured yet.
              </p>
              <button
                className="support-topic-link"
                type="button"
                onClick={() => showSupportSection("contact-customer-care")}
              >
                Contact Customer Care
              </button>
            </article>
          </div>
        </section>
      </>
    );
  }

  function renderProductDetails() {
    if (!selectedProduct) {
      return (
        <section className="product-not-found">
          <h1>Product not found</h1>
          <p>This product may have been removed from the catalog.</p>
          <button
            className="add-button"
            type="button"
            onClick={() => showSection("home")}
          >
            Back to products
          </button>
        </section>
      );
    }

    const reviews = getProductReviews(selectedProduct, customerReviews);
    const variants = Object.entries(selectedProduct.variants ?? {});
    const variantInStock = selectedVariantStock > selectedVariantQuantityInCart;
    const colorVariant = selectedVariants.Color;
    const selectedImage = getProductImage(selectedProduct, selectedVariants);
    const hasColorImage = Boolean(
      selectedProduct.variantImages?.[`Color=${colorVariant}`],
    );
    const averageRating = getAverageRating(reviews);

    return (
      <section className="product-page" aria-labelledby="detail-title">
        <button
          className="continue-shopping"
          type="button"
          onClick={() => showSection("home")}
        >
          <span aria-hidden="true">←</span> Back to products
        </button>
        <div className="product-detail-layout">
          <div className="detail-image-wrap">
            <img
              className="detail-image"
              src={selectedImage}
              alt={`${selectedProduct.name}${colorVariant ? ` in ${colorVariant}` : ""}`}
              style={{
                filter: getColorImageFilter(colorVariant, hasColorImage),
              }}
            />
            {selectedProduct.badge && (
              <span className="product-badge">{selectedProduct.badge}</span>
            )}
          </div>
          <div className="detail-information">
            <p className="eyebrow">{selectedProduct.category}</p>
            <h1 id="detail-title">{selectedProduct.name}</h1>
            <div className="detail-rating">
              {averageRating === null ? (
                <strong>No ratings yet</strong>
              ) : (
                <>
                  <span className="rating-star" aria-hidden="true">
                    ★
                  </span>
                  <strong>{averageRating.toFixed(1)}</strong>
                </>
              )}
              <span>
                ({reviews.length} customer{" "}
                {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
            <p className="detail-price">{currency(selectedProduct.price)}</p>
            <p className="detail-stock">
              {variantInStock
                ? `${selectedVariantStock - selectedVariantQuantityInCart} in stock for this selection`
                : "Out of stock"}
            </p>

            {variants.map(([name, options]) => (
              <fieldset className="variant-fieldset" key={name}>
                <legend>
                  {name} <span>{selectedVariants[name]}</span>
                </legend>
                <div className="variant-options">
                  {options.map((option) => (
                    <button
                      className={`variant-option ${selectedVariants[name] === option ? "selected" : ""}`}
                      key={option}
                      type="button"
                      aria-pressed={selectedVariants[name] === option}
                      onClick={() =>
                        setSelectedVariants((current) => ({
                          ...current,
                          [name]: option,
                        }))
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="detail-add-row">
              <label className="quantity-label" htmlFor="product-quantity">
                Quantity
              </label>
              <select
                id="product-quantity"
                value={
                  maxAddableQuantity === 0
                    ? ""
                    : Math.min(selectedQuantity, maxAddableQuantity)
                }
                onChange={(event) =>
                  setSelectedQuantity(Number(event.target.value))
                }
                disabled={maxAddableQuantity === 0}
              >
                {maxAddableQuantity === 0 ? (
                  <option value="">Unavailable</option>
                ) : (
                  Array.from(
                    { length: maxAddableQuantity },
                    (_, index) => index + 1,
                  ).map((quantity) => (
                    <option key={quantity} value={quantity}>
                      {quantity}
                    </option>
                  ))
                )}
              </select>
              <button
                className="add-button detail-add-button"
                type="button"
                disabled={maxAddableQuantity === 0}
                onClick={() =>
                  addToCart(selectedProduct, selectedVariants, selectedQuantity)
                }
              >
                {maxAddableQuantity === 0 ? "Limit reached" : "Add to cart"}
              </button>
            </div>
            <p className="quantity-help">
              Maximum {MAX_PRODUCT_QUANTITY} of this product per customer. Stock
              is tracked for each selected variant combination.
            </p>
            <p className="cart-message" role="status" aria-live="polite">
              {cartMessage}
            </p>
          </div>
        </div>

        <section
          className="description-section"
          aria-labelledby="description-title"
        >
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
              {averageRating === null ? (
                "No ratings yet"
              ) : (
                <>
                  <span className="rating-star" aria-hidden="true">
                    ★
                  </span>{" "}
                  {averageRating.toFixed(1)} out of 5
                </>
              )}
            </span>
          </div>
          {reviews.length > 0 ? (
            <div className="review-list">
              {reviews.map((review, index) => (
                <article
                  className="review-card"
                  key={`${review.name}-${index}`}
                >
                  <div className="review-card-heading">
                    <h3>{review.name}</h3>
                    <span
                      className="review-stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p>{review.comment}</p>
                  <time>{review.date}</time>
                </article>
              ))}
            </div>
          ) : (
            <p className="no-reviews">
              No customer feedback yet. Be the first to share your experience.
            </p>
          )}
          {user ? (
            <form
              className="review-form"
              onSubmit={(event) => submitReview(event, selectedProduct)}
            >
              <h3>Leave your feedback</h3>
              <label htmlFor="review-rating">Your rating</label>
              <select
                id="review-rating"
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} {rating === 1 ? "star" : "stars"}
                  </option>
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
              <button className="add-button" type="submit">
                Post feedback
              </button>
              <p className="cart-message" role="status">
                {reviewMessage}
              </p>
            </form>
          ) : (
            <div className="review-sign-in">
              <p>Sign in to leave a rating and comment.</p>
              <button
                className="continue-shopping"
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthReturnRoute({
                    hash: `product/${selectedProduct.id}`,
                    route: { page: "product", productId: selectedProduct.id },
                  });
                  setAuthError("");
                  navigate("login", { page: "login" });
                }}
              >
                Sign in to leave feedback
              </button>
            </div>
          )}
        </section>
      </section>
    );
  }

  function renderAuth() {
    return (
      <section className="auth-page" aria-labelledby="auth-title">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO SHÓPEASE</p>
          <h1 id="auth-title">
            {authMode === "signup" ? "Create your account" : "Sign in"}
          </h1>
          <p className="intro">
            {authMode === "signup"
              ? "Create an account to continue with your order and share product feedback."
              : "Sign in to continue to your cart and checkout."}
          </p>
          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Account options"
          >
            <button
              className={`auth-tab ${authMode === "login" ? "selected" : ""}`}
              type="button"
              role="tab"
              aria-selected={authMode === "login"}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${authMode === "signup" ? "selected" : ""}`}
              type="button"
              role="tab"
              aria-selected={authMode === "signup"}
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
            >
              Sign up
            </button>
          </div>
          {user ? (
            <div className="signed-in-notice">
              <p>You are signed in as {user.email}.</p>
              <button
                className="add-button"
                type="button"
                onClick={() => navigate("cart", { page: "cart" })}
              >
                Return to cart
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === "signup" && (
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
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={authPasswordVisible ? "text" : "password"}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  autoComplete={
                    authMode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={8}
                  maxLength={128}
                  pattern={
                    authMode === "signup"
                      ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,128}"
                      : undefined
                  }
                  required
                />
                <button
                  className="password-visibility-toggle"
                  type="button"
                  onClick={() => setAuthPasswordVisible((visible) => !visible)}
                  aria-label={
                    authPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={authPasswordVisible}
                >
                  {authPasswordVisible ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c5.2 0 8.7 4.1 10 7-.4.9-1.1 2-2.1 3M6.2 6.2C3.9 7.7 2.5 10 2 12c1.3 2.9 4.8 7 10 7 1.2 0 2.3-.2 3.3-.6" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {authMode === "signup" && (
                <p className="form-hint">
                  At least 8 characters with uppercase and lowercase letters, a
                  number, and a special character.
                </p>
              )}
              {authMode === "signup" && (
                <>
                  <label htmlFor="auth-confirm-password">
                    Confirm password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      id="auth-confirm-password"
                      type={authConfirmPasswordVisible ? "text" : "password"}
                      value={authConfirmPassword}
                      onChange={(event) =>
                        setAuthConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                    <button
                      className="password-visibility-toggle"
                      type="button"
                      onClick={() =>
                        setAuthConfirmPasswordVisible((visible) => !visible)
                      }
                      aria-label={
                        authConfirmPasswordVisible
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-pressed={authConfirmPasswordVisible}
                    >
                      {authConfirmPasswordVisible ? (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c5.2 0 8.7 4.1 10 7-.4.9-1.1 2-2.1 3M6.2 6.2C3.9 7.7 2.5 10 2 12c1.3 2.9 4.8 7 10 7 1.2 0 2.3-.2 3.3-.6" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
              {authError && (
                <p className="form-error" role="alert">
                  {authError}
                </p>
              )}
              <button
                className="add-button auth-submit"
                type="submit"
                disabled={authBusy || authLoading}
              >
                {authBusy
                  ? "Please wait…"
                  : authMode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
              {authMode === "login" && (
                <>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                  <button
                    className="google-signin-button"
                    type="button"
                    onClick={() =>
                      setAuthError("Google sign-in is not connected yet.")
                    }
                  >
                    <span className="google-mark" aria-hidden="true">
                      G
                    </span>
                    Continue with Google
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </section>
    );
  }

  function renderPhoneVerification() {
    if (!user) {
      return (
        <section
          className="auth-page"
          aria-labelledby="phone-verification-title"
        >
          <div className="auth-card">
            <p className="eyebrow">PHONE VERIFICATION</p>
            <h1 id="phone-verification-title">Sign in to continue</h1>
            <p className="intro">
              You need an account to verify a phone number.
            </p>
            <button
              className="add-button auth-submit"
              type="button"
              onClick={() => navigate("login", { page: "login" })}
            >
              Sign in
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="auth-page" aria-labelledby="phone-verification-title">
        <div className="auth-card">
          <p className="eyebrow">PHONE VERIFICATION</p>
          <h1 id="phone-verification-title">Verify your number</h1>
          <p className="intro">
            Enter your contact number. A six-digit verification code will appear
            below for local development.
          </p>
          <form className="auth-form" onSubmit={submitPhoneVerification}>
            <label htmlFor="phone-verification-number">Contact number</label>
            <input
              id="phone-verification-number"
              type="tel"
              value={profilePhone}
              onChange={(event) => {
                setProfilePhone(event.target.value);
                setPhoneCodeSent(false);
                setDevelopmentPhoneCode("");
                setPhoneVerificationCode("");
              }}
              autoComplete="tel"
              minLength={7}
              maxLength={20}
              title="Use 7 to 20 characters: digits, spaces, +, parentheses, or hyphens."
              required
            />
            {phoneCodeSent && (
              <>
                <label htmlFor="phone-verification-code">
                  Verification code
                </label>
                <input
                  id="phone-verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={phoneVerificationCode}
                  onChange={(event) =>
                    setPhoneVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  required
                />
                <p
                  className={`form-hint ${phoneOtpRemainingSeconds === 0 ? "form-error" : ""}`}
                  role="timer"
                >
                  {phoneOtpRemainingSeconds > 0
                    ? `Code expires in ${Math.floor(phoneOtpRemainingSeconds / 60)}:${String(phoneOtpRemainingSeconds % 60).padStart(2, "0")}.`
                    : "This code has expired. Request a new one to continue."}
                </p>
                {developmentPhoneCode && (
                  <p className="development-code" role="status">
                    Local development code:{" "}
                    <strong>{developmentPhoneCode}</strong>
                  </p>
                )}
              </>
            )}
            {authError && (
              <p className="form-error" role="alert">
                {authError}
              </p>
            )}
            {!phoneCodeSent ? (
              <button
                className="add-button auth-submit"
                type="button"
                onClick={() => sendPhoneVerificationCode()}
                disabled={authBusy}
              >
                {authBusy ? "Sending…" : "Send verification code"}
              </button>
            ) : (
              <>
                <button
                  className="add-button auth-submit"
                  type="submit"
                  disabled={authBusy || phoneOtpRemainingSeconds === 0}
                >
                  {authBusy ? "Verifying…" : "Verify phone number"}
                </button>
                <button
                  className="text-button resend-phone-code"
                  type="button"
                  onClick={() => sendPhoneVerificationCode()}
                  disabled={authBusy || phoneOtpResendSeconds > 0}
                >
                  {phoneOtpResendSeconds > 0
                    ? `Resend code in ${phoneOtpResendSeconds}s`
                    : "Resend code"}
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="auth-page" aria-labelledby="profile-setup-title">
        <div className="auth-card">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1 id="profile-setup-title">Profile</h1>
          <p className="intro">
            {user
              ? `Profile details for ${user.email}.`
              : "Sign in to complete your profile."}
          </p>
          {user ? (
            <form className="auth-form" onSubmit={submitProfile}>
              <label htmlFor="profile-phone">Verified phone number</label>
              <input
                id="profile-phone"
                type="tel"
                value={user.phone ?? ""}
                autoComplete="tel"
                readOnly
                required
              />
              <label htmlFor="profile-address">Shipping address</label>
              <textarea
                id="profile-address"
                value={profileAddress}
                onChange={(event) => setProfileAddress(event.target.value)}
                autoComplete="street-address"
                minLength={10}
                maxLength={300}
                rows={4}
                required
              />
              {authError && (
                <p className="form-error" role="alert">
                  {authError}
                </p>
              )}
              <button
                className="add-button auth-submit"
                type="submit"
                disabled={authBusy}
              >
                {authBusy
                  ? "Saving…"
                  : user.profileComplete
                    ? "Save profile"
                    : "Save and continue"}
              </button>
            </form>
          ) : (
            <button
              className="add-button auth-submit"
              type="button"
              onClick={() => navigate("login", { page: "login" })}
            >
              Sign in
            </button>
          )}
        </div>
      </section>
    );
  }

  function renderCheckout() {
    return (
      <section className="checkout-page" aria-labelledby="checkout-title">
        <p className="eyebrow">DEMO CHECKOUT</p>
        <h1 id="checkout-title">Payment</h1>
        <p className="intro">
          This is a demo payment flow. No payment details are requested or
          charged.
        </p>
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
                <span>
                  {item.product.name} × {item.quantity}
                </span>
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
    );
  }

  function renderOrderComplete() {
    return (
      <section
        className="order-complete-page"
        aria-labelledby="order-complete-title"
      >
        <div className="order-complete-icon" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">DEMO ORDER</p>
        <h1 id="order-complete-title">Order complete</h1>
        <p>This demo order was completed without processing a payment.</p>
        <button
          className="add-button"
          type="button"
          onClick={() => showSection("home")}
        >
          Continue shopping
        </button>
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="settings-page" aria-labelledby="settings-title">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 id="settings-title">Settings</h1>
        {user ? (
          <div className="settings-card">
            <div className="settings-avatar" aria-hidden="true">
              {getUserInitials(user.name)}
            </div>
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
        <button
          className="continue-shopping"
          type="button"
          onClick={() => showSection("home")}
        >
          <span aria-hidden="true">←</span> Back to shopping
        </button>
      </section>
    );
  }

  return (
    <main className="page-shell" id="home">
      {renderHeader()}
      {route.page === "cart"
        ? renderCart()
        : route.page === "login"
          ? renderAuth()
          : route.page === "phone-verification"
            ? renderPhoneVerification()
            : route.page === "profile"
              ? renderProfile()
              : route.page === "checkout"
                ? renderCheckout()
                : route.page === "order-complete"
                  ? renderOrderComplete()
                  : route.page === "settings"
                    ? renderSettings()
                    : route.page === "product"
                      ? renderProductDetails()
                      : renderHome()}
      <footer className="status-bar">
        <span className="status-dot" aria-hidden="true" />
        <p role="status">{apiStatus}</p>
        <span className="footer-copy">© ShopEase</span>
      </footer>
    </main>
  );
}

export default App;
