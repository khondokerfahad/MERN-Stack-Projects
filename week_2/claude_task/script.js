const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 59.99,
    image: "https://via.placeholder.com/300x300?text=Headphones",
  },
  {
    id: 2,
    name: "Smart Watch",
    price: 129.99,
    image: "https://via.placeholder.com/300x300?text=Smart+Watch",
  },
  {
    id: 3,
    name: "Bluetooth Speaker",
    price: 39.99,
    image: "https://via.placeholder.com/300x300?text=Speaker",
  },
  {
    id: 4,
    name: "Laptop Backpack",
    price: 49.99,
    image: "https://via.placeholder.com/300x300?text=Backpack",
  },
];

console.log(products);

// 1. Select the container
const productsGrid = document.querySelector(".products-grid");

// 2. Check if the container exists
if (productsGrid) {
  // 3. Clear any existing content
  productsGrid.innerHTML = "";

  // 4. Loop through each product
  products.forEach(function (product) {
    // 5. Create HTML for one product card
    const productCard = `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">$${product.price}</p>
        <button class="add-to-cart">Add to Cart</button>
      </article>
    `;

    // 6. Add the card into the grid
    productsGrid.innerHTML += productCard;
  });
}
