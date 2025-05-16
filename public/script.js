document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded")

  // Check which page we're on
  const currentPage = window.location.pathname.split("/").pop() || "index.html"
  console.log("Current page:", currentPage)

  // Kintamasis visoms naujienoms saugoti
  let allNews = []

  // Helper function to show sections
  function showSection(sectionId) {
    const sections = document.querySelectorAll(".section")
    if (sections.length > 0) {
      sections.forEach((section) => {
        section.classList.remove("active")
      })
      const section = document.getElementById(sectionId + "-section")
      if (section) section.classList.add("active")
    }
  }

  // Helper function to redirect to another page
  function redirectTo(page) {
    window.location.href = page
  }

  // LOGIN forma
  const loginForm = document.getElementById("login-form")
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const usernameInput = document.getElementById("username")
      const passwordInput = document.getElementById("password")
      const errorElement = document.getElementById("login-error")

      if (!usernameInput || !passwordInput) {
        console.error("Username or password input not found")
        return
      }

      const username = usernameInput.value
      const password = passwordInput.value

      try {
        const response = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (response.ok) {
          const user = {
            username,
            isAdmin: data.isAdmin,
            auth_code: data.auth_code,
          }
          localStorage.setItem("currentUser", JSON.stringify(user))

          if (data.isAdmin) {
            const twofaFormEl = document.getElementById("twofa-form")

            if (twofaFormEl) {
              // We're on the login page with 2FA form
              loginForm.style.display = "none"
              twofaFormEl.style.display = "block"

              const loginTitleEl = document.getElementById("login-title")
              const loginDescEl = document.getElementById("login-description")

              if (loginTitleEl) loginTitleEl.textContent = "Two-Factor Authentication"
              if (loginDescEl) loginDescEl.textContent = "Enter the verification code from your authenticator app"
            } else {
              // No 2FA form, redirect directly to admin page
              redirectTo("admin.html")
            }
          } else {
            // Regular user, redirect to news page
            redirectTo("index.html")
          }
        } else if (errorElement) {
          errorElement.textContent = data.message || "Invalid username or password"
        }
      } catch (err) {
        console.error("Login error:", err)
        if (errorElement) {
          errorElement.textContent = "Server error"
        }
      }
    })
  }

  // 2FA
  const twofaForm = document.getElementById("twofa-form")
  if (twofaForm) {
    twofaForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const codeInput = document.getElementById("twoFactorCode")
      const errorElement = document.getElementById("twofa-error")

      if (!codeInput) {
        console.error("Two-factor code input not found")
        return
      }

      const code = codeInput.value
      const user = JSON.parse(localStorage.getItem("currentUser") || "null")

      if (user && code === user.auth_code) {
        // Redirect to admin page after successful 2FA
        redirectTo("admin.html")
      } else if (errorElement) {
        errorElement.textContent = "Invalid verification code"
      }
    })
  }

  // Load news for regular users
  async function loadNews() {
    try {
      const response = await fetch("http://localhost:3000/api/news")
      const news = await response.json()
      // Išsaugome visas naujienas
      allNews = news
      const container = document.getElementById("news-container")

      if (container) {
        renderNews(news, "news-container")
      } else {
        console.error("News container not found")
      }
    } catch (err) {
      console.error("News fetch error:", err)
    }
  }

  // Load admin dashboard
  async function loadAdminDashboard() {
    try {
      const response = await fetch("http://localhost:3000/api/news")
      const news = await response.json()
      const container = document.getElementById("admin-news-container")

      if (container) {
        renderAdminNews(news)
      } else {
        console.error("Admin news container not found on page:", currentPage)
      }
    } catch (err) {
      console.error("Admin news fetch error:", err)
    }
  }

  // Render news for regular users
  function renderNews(news, containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error(`Container with ID ${containerId} not found`)
      return
    }

    container.innerHTML = ""

    if (news.length === 0) {
      container.innerHTML = '<div class="empty-message">Nėra receptų.</div>'
      return
    }

    news.forEach((item) => {
      const newsItem = document.createElement("div")
      newsItem.className = "news-item"
      newsItem.innerHTML = `
        <div class="news-item-header">
          <h3>${escapeHtml(item.title)}</h3>
          <p>Publikuota: ${new Date(item.created_at).toLocaleDateString("lt-LT")}</p>
        </div>
        <div class="news-item-content">
          <p>${escapeHtml(item.content)}</p>
        </div>
      `
      container.appendChild(newsItem)
    })
  }

  // Render news for admin dashboard
  function renderAdminNews(news) {
    const container = document.getElementById("admin-news-container")
    if (!container) {
      console.error("Admin news container not found")
      return
    }

    container.innerHTML = ""

    if (news.length === 0) {
      container.innerHTML = '<div class="empty-message">Nėra receptų.</div>'
      return
    }

    news.forEach((item) => {
      const newsItem = document.createElement("div")
      newsItem.className = "news-item"
      newsItem.innerHTML = `
        <div class="news-item-header">
          <h3>${escapeHtml(item.title)}</h3>
          <p>Publikuota: ${new Date(item.created_at).toLocaleDateString("lt-LT")}</p>
        </div>
        <div class="news-item-content">
          <p>${escapeHtml(item.content)}</p>
        </div>
        <div class="news-item-actions">
          <a href="edit.html?id=${item.id}" class="btn btn-secondary">Redaguoti</a>
          <button class="btn btn-danger delete-btn" data-id="${item.id}">Ištrinti</button>
        </div>
      `
      container.appendChild(newsItem)
    })

    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll(".delete-btn")
    if (deleteButtons.length > 0) {
      deleteButtons.forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (confirm("Ar tikrai norite ištrinti šį receptą?")) {
            try {
              await fetch(`http://localhost:3000/api/news/${btn.dataset.id}`, {
                method: "DELETE",
              })
              loadAdminDashboard()
            } catch (err) {
              console.error("Error deleting news:", err)
              alert("Nepavyko ištrinti recepto")
            }
          }
        })
      })
    }
  }

  // Paieškos funkcija
  function searchNews(query) {
    if (!query.trim()) {
      return allNews // Jei paieškos užklausa tuščia, grąžiname visas naujienas
    }

    query = query.toLowerCase()
    return allNews.filter((item) => {
      return item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query)
    })
  }

  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    if (!unsafe) return ""
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  // Edit news form handling
  const editNewsForm = document.getElementById("edit-news-form")
  if (editNewsForm) {
    // If we're on the edit page, load the news item data
    const urlParams = new URLSearchParams(window.location.search)
    const newsId = urlParams.get("id")

    if (newsId) {
      // Load the news item data
      loadNewsItemForEdit(newsId)
    }

    // Add submit event listener
    editNewsForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const titleInput = document.getElementById("edit-news-title")
      const contentInput = document.getElementById("edit-news-content")
      const errorElement = document.getElementById("edit-error")

      if (!titleInput || !contentInput) {
        console.error("Edit form inputs not found")
        return
      }

      const title = titleInput.value
      const content = contentInput.value

      try {
        const response = await fetch(`http://localhost:3000/api/news/${newsId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        })

        if (response.ok) {
          // Pakeista: nukreipiame atgal į admin puslapį, o ne į index
          redirectTo("admin.html")
        } else {
          const data = await response.json()
          if (errorElement) {
            errorElement.textContent = data.message || "Failed to update news"
          }
        }
      } catch (err) {
        console.error("Error updating news:", err)
        if (errorElement) {
          errorElement.textContent = "Server error"
        }
      }
    })
  }

  // Load news item for editing
  async function loadNewsItemForEdit(id) {
    try {
      const response = await fetch(`http://localhost:3000/api/news`)
      const news = await response.json()
      const item = news.find((n) => n.id == id)

      if (!item) {
        alert("Receptas nerastas")
        return
      }

      const titleInput = document.getElementById("edit-news-title")
      const contentInput = document.getElementById("edit-news-content")

      if (titleInput && contentInput) {
        titleInput.value = item.title
        contentInput.value = item.content
      } else {
        console.error("Edit form elements not found")
      }
    } catch (err) {
      console.error("Error loading news item for edit:", err)
    }
  }

  // Create news form submission
  const createNewsForm = document.getElementById("create-news-form")
  if (createNewsForm) {
    createNewsForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const titleInput = document.getElementById("news-title")
      const contentInput = document.getElementById("news-content")
      const errorElement = document.getElementById("create-error")

      if (!titleInput || !contentInput) {
        console.error("Create form inputs not found")
        return
      }

      const title = titleInput.value
      const content = contentInput.value

      try {
        const response = await fetch("http://localhost:3000/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        })

        if (response.ok) {
          // Pakeista: nukreipiame atgal į admin puslapį, o ne į index
          redirectTo("admin.html")
        } else {
          const data = await response.json()
          if (errorElement) {
            errorElement.textContent = data.message || "Failed to create news"
          }
        }
      } catch (err) {
        console.error("Error creating news:", err)
        if (errorElement) {
          errorElement.textContent = "Server error"
        }
      }
    })
  }

  // Initialize page based on current page
  if (currentPage === "admin.html") {
    // Check if user is admin before loading admin dashboard
    const user = JSON.parse(localStorage.getItem("currentUser") || "null")
    if (user && user.isAdmin) {
      loadAdminDashboard()
    } else {
      // Not an admin, redirect to login
      redirectTo("login.html")
    }
  } else if (currentPage === "index.html" || currentPage === "") {
    // Visada krauname naujienas pagrindiniame puslapyje
    loadNews()

    // Paieškos funkcionalumo pridėjimas
    const searchInput = document.getElementById("search-input")
    const searchButton = document.getElementById("search-button")
    const searchResultsHeader = document.getElementById("search-results-header")
    const searchQuery = document.getElementById("search-query")
    const clearSearch = document.getElementById("clear-search")

    if (searchButton && searchInput) {
      // Paieškos mygtuko paspaudimas
      searchButton.addEventListener("click", () => {
        const query = searchInput.value.trim()
        if (query) {
          const results = searchNews(query)
          renderNews(results, "news-container")

          // Rodome paieškos rezultatų antraštę
          if (searchResultsHeader) {
            searchResultsHeader.style.display = "block"
            if (searchQuery) {
              searchQuery.textContent = `"${query}"`
            }
          }
        }
      })

      // Enter klavišo paspaudimas paieškos laukelyje
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          searchButton.click()
        }
      })
    }

    // Paieškos išvalymo mygtukas
    if (clearSearch) {
      clearSearch.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = ""
        }
        renderNews(allNews, "news-container")
        if (searchResultsHeader) {
          searchResultsHeader.style.display = "none"
        }
      })
    }
  } else if (currentPage === "create.html" || currentPage === "edit.html") {
    // Tikriname, ar vartotojas yra administratorius
    const user = JSON.parse(localStorage.getItem("currentUser") || "null")
    if (!(user && user.isAdmin)) {
      redirectTo("login.html")
    }
  }

  // Add logout functionality to logout buttons
  const logoutButtons = document.querySelectorAll('.btn-logout, a[href="index.html"].btn-secondary')
  logoutButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      // Only handle logout for authenticated users
      const user = JSON.parse(localStorage.getItem("currentUser") || "null")
      if (user) {
        e.preventDefault()
        localStorage.removeItem("currentUser")
        redirectTo("index.html")
      }
    })
  })

  console.log("App initialized")
})
