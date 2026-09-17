// 1. Your product data — an array of objects
document.addEventListener("DOMContentLoaded", function () {
  const products = [
    {
      name: 'Walton WTF9S3 Tornado Fan (09")',
      price: 1245,
      img: "https://img.drz.lazcdn.com/static/bd/p/480c36eb0ed2a5112225178afdbc6071.jpg_400x400q80.jpg_.avif",
      category: "Electronics",
    },
    {
      name: 'Hogo HG-17 Rechargeable 16" Stand Table Fan. Lithium Battery-7.4V (4000mAh)',
      price: 3749,
      img: "https://img.drz.lazcdn.com/static/bd/p/f48a3ac0399be787bec8139b7c4e16ce.jpg_400x400q80.jpg_.avif",
      category: "Electronics",
    },
    {
      name: "oraimo Necklace Lite (OEB-311) Call Vibration Wireless Earphones light gold/ sage green/ Black",
      price: 1258,
      img: "https://img.drz.lazcdn.com/static/bd/p/e1ddb0912724ed5c04bbe712c9555a0f.jpg_400x400q80.jpg_.avif",
      category: "Electronics",
    },
    {
      name: "Geometric Bandana For Men and Women",
      price: 37,
      img: "https://img.drz.lazcdn.com/static/bd/p/ba93eb9a2d389f51b5dbee6e21108a28.jpg_200x200q80.avif",
      category: "Clothing",
    },
    // duplicate this object, changing name/price, until you have ~20 total
  ];

  const PRODUCTS_PER_PAGE = 12;
  let currentPage = 1;

  const grid = document.getElementById("productGrid");
  const paginationEl = document.getElementById("pagination");

  function renderProducts(page) {
    grid.innerHTML = "";
    const filtered = getFilteredProducts();
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    const pageItems = filtered.slice(start, end);

    pageItems.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${product.img}" alt="${product.name}" />
        <h3>${product.name}</h3>
        <p>৳ ${product.price}</p>
        <div class="card-actions">
          <button class="btn-secondary">Add to Cart</button>
          <button class="btn-outline-dark">View Details</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  const categoryFilterEl = document.getElementById("categoryFilter");
  let currentCategory = "all";

  function populateCategoryFilter() {
    // Set() automatically removes duplicates — turns 21 categories into just the unique ones
    const categories = [...new Set(products.map((p) => p.category))];

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categoryFilterEl.appendChild(option);
    });
  }

  function getFilteredProducts() {
    if (currentCategory === "all") return products;
    return products.filter((p) => p.category === currentCategory);
  }

  function renderPagination() {
    paginationEl.innerHTML = "";
    const filtered = getFilteredProducts();
    const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = "page-btn";
      if (i === currentPage) btn.classList.add("active");

      btn.addEventListener("click", () => {
        currentPage = i;
        renderProducts(currentPage);
        renderPagination();
      });

      paginationEl.appendChild(btn);
    }
  }

  categoryFilterEl.addEventListener("change", (e) => {
    currentCategory = e.target.value;
    currentPage = 1; // reset to page 1 whenever the filter changes
  });

  populateCategoryFilter();
  renderProducts(currentPage);
  renderPagination();
});
