const cartIcon = document.querySelector("#cart-icon");
const cart = document.querySelector(".cart");
const cartClose = document.querySelector(".close-icon");
cartIcon.addEventListener("click", () => cart.classList.add("active"));
cartClose.addEventListener("click", () => cart.classList.remove("active"));


const addCartButtons = document.querySelectorAll(".add-cart");
addCartButtons.forEach(button => {
button.addEventListener("click", event => {
const productBox = event. target.closest(".product-card");
addToCart(productBox);

});
});

