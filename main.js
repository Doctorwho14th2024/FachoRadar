import './style.css'

const API_URL = 'http://localhost:3000/api'

// Gestion de l'état de la connexion
const connectionStatus = document.getElementById('connectionStatus')

function updateConnectionStatus(status) {
  const [dot, text] = connectionStatus.children
  
  switch (status) {
    case 'connecting':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-yellow-500'
      text.textContent = 'Connexion...'
      text.className = 'text-gray-400'
      break
    case 'connected':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-green-500'
      text.textContent = 'Connecté'
      text.className = 'text-gray-400'
      setTimeout(() => {
        connectionStatus.style.opacity = '0'
        setTimeout(() => connectionStatus.style.display = 'none', 1000)
      }, 2000)
      break
    case 'error':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-red-500'
      text.textContent = 'Déconnecté'
      text.className = 'text-red-400'
      connectionStatus.style.display = 'flex'
      connectionStatus.style.opacity = '1'
      break
  }
}

// Test de connexion au serveur avec retry
async function testConnection(retries = 3) {
  updateConnectionStatus('connecting')
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Tentative de connexion ${i + 1}/${retries}...`)
      const response = await fetch(`${API_URL}/fachos`)
      if (!response.ok) throw new Error('Erreur serveur')
      console.log('✅ Connexion au serveur réussie')
      updateConnectionStatus('connected')
      return true
    } catch (error) {
      console.error(`❌ Erreur de connexion (tentative ${i + 1}):`, error)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1s entre les tentatives
      }
    }
  }
  message.textContent = "Impossible de se connecter au serveur. Veuillez recharger la page."
  message.classList.add('text-red-400')
  updateConnectionStatus('error')
  return false
}
testConnection()

const form = document.getElementById('fachoForm')
const message = document.getElementById('message')
const listContainer = document.getElementById('fachoList')
const searchInput = document.getElementById('searchInput')

let fachos = []

function renderList(filter = '') {
  listContainer.innerHTML = ''

  const filtered = fachos.filter(f =>
    f.pseudo.toLowerCase().includes(filter.toLowerCase()) ||
    f.preuve.toLowerCase().includes(filter.toLowerCase())
  )

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="text-gray-400">Aucun compte trouvé.</p>'
    return
  }

  filtered.forEach(f => {
    const div = document.createElement('div')
    div.className = 'bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm shadow-lg card-animation card-hover'
    div.innerHTML = `
      <div class="flex items-start justify-between">
        <h3 class="text-xl font-bold text-gray-100 flex items-center gap-2">
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          ${f.pseudo}
        </h3>
        <span class="text-xs text-gray-400">${new Date(f.created_at).toLocaleDateString()}</span>
      </div>
      <a class="mt-2 inline-flex items-center text-red-400 hover:text-red-300 transition-colors" 
         href="${f.lien}" target="_blank" rel="noopener noreferrer">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Voir le compte
      </a>
      <p class="mt-3 text-gray-300 whitespace-pre-wrap">${f.preuve}</p>
    `
    listContainer.appendChild(div)
  })
}

async function loadFachos(newItemId = null) {
  try {
    console.log('Tentative de chargement des données...')
    const response = await fetch(`${API_URL}/fachos`)
    
    if (!response.ok) {
      console.error('Réponse serveur non-ok:', {
        status: response.status,
        statusText: response.statusText
      })
      const errorText = await response.text()
      console.error('Contenu de l\'erreur:', errorText)
      throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`)
    }
    
    fachos = await response.json()
    console.log(`✅ ${fachos.length} comptes chargés`)
    renderList()

    // Mettre en évidence le nouveau compte ajouté
    if (newItemId) {
      const newItem = document.querySelector(`[data-facho-id="${newItemId}"]`)
      if (newItem) {
        newItem.classList.add('list-item-new')
        // Scroll vers le nouveau compte
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  } catch (error) {
    console.error('Erreur détaillée:', error)
    message.textContent = `Erreur: ${error.message || 'Impossible de charger les données'}`
    message.classList.remove('text-green-400')
    message.classList.add('text-red-400')
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const pseudo = form.pseudo.value.trim()
  const lien = form.lien.value.trim()
  const preuve = form.preuve.value.trim()

  if (!pseudo || !lien || !preuve) {
    message.textContent = "Tous les champs sont requis."
    message.classList.remove('text-green-400')
    message.classList.add('text-red-400')
    return
  }

  try {
    const response = await fetch(`${API_URL}/fachos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pseudo, lien, preuve })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de l\'ajout')
    }

    const newFacho = await response.json()
    message.textContent = "✅ Compte ajouté avec succès"
    message.classList.remove('text-red-400')
    message.classList.add('text-green-400')
    form.reset()
    await loadFachos(newFacho.id) // Passer l'ID du nouveau compte pour le mettre en évidence
  } catch (error) {
    console.error('Erreur:', error)
    message.textContent = error.message
    message.classList.remove('text-green-400')
    message.classList.add('text-red-400')
  }
})

searchInput.addEventListener('input', () => {
  renderList(searchInput.value)
})

loadFachos()
