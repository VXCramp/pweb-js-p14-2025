
const userFirstName = localStorage.getItem("userFirstName")
if (!userFirstName) {
  window.location.href = "index.html"
}

document.getElementById("userName").textContent = `Welcome, ${userFirstName}`

document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem("userFirstName")
  localStorage.removeItem("userId")
  window.location.href = "index.html"
})

let allRecipes = []
let filteredRecipes = []
let displayedRecipes = []
let currentIndex = 0
const recipesPerPage = 9
let searchTimeout

const recipesGrid = document.getElementById("recipesGrid")
const searchInput = document.getElementById("searchInput")
const cuisineFilter = document.getElementById("cuisineFilter")
const showMoreButton = document.getElementById("showMoreButton")
const showMoreContainer = document.getElementById("showMoreContainer")
const loadingState = document.getElementById("loadingState")
const errorState = document.getElementById("errorState")
const retryButton = document.getElementById("retryButton")
const recipeModal = document.getElementById("recipeModal")
const modalClose = document.querySelector(".modal-close")
const hamburgerMenu = document.getElementById("hamburgerMenu")
const navUser = document.querySelector(".nav-user")

  hamburgerMenu.addEventListener("click", () => {
    navUser.classList.toggle("active")
  })

async function init() {
  await fetchRecipes()
  setupEventListeners()
}

async function fetchRecipes() {
  try {
    showLoading()

    const response = await fetch("https://dummyjson.com/recipes")

    if (!response.ok) {
      throw new Error("Failed to fetch recipes")
    }

    const data = await response.json()
    allRecipes = data.recipes
    filteredRecipes = [...allRecipes]

    populateCuisineFilter()
    displayRecipes()
    hideLoading()
  } catch (error) {
    console.error("Error fetching recipes:", error)
    showError("Failed to load recipes. Please check your connection and try again.")
  }
}

function populateCuisineFilter() {
  const cuisines = [...new Set(allRecipes.map((recipe) => recipe.cuisine))].sort();

  cuisines.forEach((cuisine) => {
    const option = document.createElement("option")
    option.value = cuisine
    option.textContent = cuisine
    cuisineFilter.appendChild(option)
  })
}

function displayRecipes() {
  currentIndex = 0
  displayedRecipes = []
  recipesGrid.innerHTML = ""
  loadMoreRecipes()
}

function loadMoreRecipes() {
  const nextRecipes = filteredRecipes.slice(currentIndex, currentIndex + recipesPerPage)
  displayedRecipes = [...displayedRecipes, ...nextRecipes]
  currentIndex += recipesPerPage

  renderRecipes(nextRecipes)
  updateShowMoreButton()
}

function renderRecipes(recipes) {
  recipes.forEach((recipe) => {
    const card = createRecipeCard(recipe)
    recipesGrid.appendChild(card)
  })
}

function createRecipeCard(recipe) {
  const card = document.createElement("div")
  card.className = "recipe-card"

  const stars = generateStars(recipe.rating)
  const difficultyClass = `difficulty-${recipe.difficulty.toLowerCase()}`
  const ingredients = recipe.ingredients.slice(0, 5).join(", ") + (recipe.ingredients.length > 5 ? "..." : "")

  card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image">
        <div class="recipe-content">
            <div class="recipe-header">
                <h3 class="recipe-name">${recipe.name}</h3>
            </div>
            <div class="recipe-meta">
                <span class="meta-item">⏱️ ${recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
                <span class="cuisine-badge">${recipe.cuisine}</span>
                <span class="difficulty-badge ${difficultyClass}">${recipe.difficulty}</span>
            </div>
            <div class="rating">
                <span class="stars">${stars}</span>
                <span class="rating-value">${recipe.rating.toFixed(1)}</span>
            </div>
            <div class="ingredients-section">
                <h4 class="ingredients-title">Ingredients:</h4>
                <p class="ingredients-list">${ingredients}</p>
            </div>
            <button class="view-recipe-btn" data-recipe-id="${recipe.id}">View Full Recipe</button>
        </div>
    `

  card.querySelector(".view-recipe-btn").addEventListener("click", () => {
    showRecipeModal(recipe)
  })

  return card
}

function generateStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  let stars = ""

  for (let i = 0; i < fullStars; i++) {
    stars += "★"
  }

  if (hasHalfStar) {
    stars += "☆"
  }

  const emptyStars = 5 - Math.ceil(rating)
  for (let i = 0; i < emptyStars; i++) {
    stars += "☆"
  }

  return stars
}

function showRecipeModal(recipe) {
  const stars = generateStars(recipe.rating)
  const difficultyClass = `difficulty-${recipe.difficulty.toLowerCase()}`

  const modalBody = document.getElementById("modalBody")
  modalBody.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}" class="modal-recipe-image">
        <h2 class="modal-recipe-title">${recipe.name}</h2>
        <div class="modal-meta">
            <span class="cuisine-badge">${recipe.cuisine}</span>
            <span class="difficulty-badge ${difficultyClass}">${recipe.difficulty}</span>
            <span class="meta-item">⏱️ Prep: ${recipe.prepTimeMinutes} min</span>
            <span class="meta-item">🍳 Cook: ${recipe.cookTimeMinutes} min</span>
            <span class="meta-item">🍽️ Servings: ${recipe.servings}</span>
            <span class="meta-item">🔥 ${recipe.caloriesPerServing} cal/serving</span>
        </div>
        <div class="rating">
            <span class="stars">${stars}</span>
            <span class="rating-value">${recipe.rating.toFixed(1)} (${recipe.reviewCount} reviews)</span>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Ingredients</h3>
            <ul class="modal-list">
                ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join("")}
            </ul>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Instructions</h3>
            <ol class="instructions-list">
                ${recipe.instructions.map((inst) => `<li>${inst}</li>`).join("")}
            </ol>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Tags</h3>
            <div class="tags-container">
                ${recipe.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
        </div>
    `

  recipeModal.style.display = "flex"
}

function closeModal() {
  recipeModal.style.display = "none"
}

function handleSearch() {
  clearTimeout(searchTimeout)

  searchTimeout = setTimeout(() => {
    const searchTerm = searchInput.value.toLowerCase().trim()
    const selectedCuisine = cuisineFilter.value

    filteredRecipes = allRecipes.filter((recipe) => {
      const matchesSearch =
        !searchTerm ||
        recipe.name.toLowerCase().includes(searchTerm) ||
        recipe.cuisine.toLowerCase().includes(searchTerm) ||
        recipe.ingredients.some((ing) => ing.toLowerCase().includes(searchTerm)) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm))

      const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine

      return matchesSearch && matchesCuisine
    })

    displayRecipes()
  }, 300) 
}

function updateShowMoreButton() {
  if (currentIndex < filteredRecipes.length) {
    showMoreContainer.style.display = "block"
  } else {
    showMoreContainer.style.display = "none"
  }
}

function setupEventListeners() {
  searchInput.addEventListener("input", handleSearch)
  cuisineFilter.addEventListener("change", handleSearch)
  showMoreButton.addEventListener("click", loadMoreRecipes)
  modalClose.addEventListener("click", closeModal)
  retryButton.addEventListener("click", fetchRecipes)

  recipeModal.addEventListener("click", (e) => {
    if (e.target === recipeModal) {
      closeModal()
    }
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && recipeModal.style.display === "flex") {
      closeModal()
    }
  })
}

function showLoading() {
  loadingState.style.display = "block"
  errorState.style.display = "none"
  recipesGrid.style.display = "none"
  showMoreContainer.style.display = "none"
}

function hideLoading() {
  loadingState.style.display = "none"
  recipesGrid.style.display = "grid"
}

function showError(message) {
  errorState.querySelector(".error-text").textContent = message
  errorState.style.display = "block"
  loadingState.style.display = "none"
  recipesGrid.style.display = "none"
  showMoreContainer.style.display = "none"
}

init()

