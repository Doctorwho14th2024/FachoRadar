import './style.css'

// En production l'API est servie par le même serveur.
// En dev, Vite proxy /api vers Express (voir vite.config.js).
const API_URL = import.meta.env.VITE_API_URL || '/api';

const headers = {
  'Content-Type': 'application/json'
};


function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function avatarSrc(url = '') {
  if (!url) return ''
  return `${API_URL}/avatar?url=${encodeURIComponent(url)}`
}

function normalizeVideos(facho = {}) {
  if (Array.isArray(facho.preuves_videos)) {
    return facho.preuves_videos.filter(video => video?.path)
  }

  if (facho.preuve_video) {
    return [{
      path: facho.preuve_video,
      name: facho.preuve_video_name || 'Preuve vidéo',
      type: facho.preuve_video_type || ''
    }]
  }

  return []
}

function readFormVideos() {
  try {
    const videos = JSON.parse(form.dataset.videos || '[]')
    return Array.isArray(videos) ? videos.filter(video => video?.path) : []
  } catch (_) {
    return []
  }
}

function setFormVideos(videos = []) {
  form.dataset.videos = JSON.stringify(videos.filter(video => video?.path))
}

const connectionStatus = document.getElementById('connectionStatus')
const form = document.getElementById('fachoForm')
const formTitle = document.getElementById('formTitle')
const message = document.getElementById('message')
const listContainer = document.getElementById('fachoList')
const searchInput = document.getElementById('searchInput')
const statusFilter = document.getElementById('statusFilter')
const categoryFilter = document.getElementById('categoryFilter')
const dateFromFilter = document.getElementById('dateFromFilter')
const dateToFilter = document.getElementById('dateToFilter')
const clearFilters = document.getElementById('clearFilters')
const resultCount = document.getElementById('resultCount')
const submitLabel = document.getElementById('submitLabel')
const cancelEdit = document.getElementById('cancelEdit')
const logoutBtn = document.getElementById('logoutBtn')
const panelList = document.getElementById('panelList')
const panelForm = document.getElementById('panelForm')
const tabList = document.getElementById('tabList')
const tabForm = document.getElementById('tabForm')
const proofVideoInput = document.getElementById('proofVideoInput')
const proofVideoCurrent = document.getElementById('proofVideoCurrent')

let fachos = []
let editingId = null
const VIDEO_UPLOAD_MAX_MB = 5120
const VIDEO_UPLOAD_MAX_BYTES = VIDEO_UPLOAD_MAX_MB * 1024 * 1024
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])
const videoTypeByExtension = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v'
}

const statusLabels = {
  a_verifier: 'À vérifier',
  verifie: 'Vérifié',
  rejete: 'Rejeté',
  doublon: 'Doublon'
}

const categoryLabels = {
  propos_haineux: 'Propos haineux',
  symboles: 'Symboles',
  symboles_identitaires: 'Symboles identitaires',
  harcelement: 'Harcèlement',
  desinformation: 'Désinformation',
  apologie: 'Apologie',
  apologie_meurtre: 'Apologie du meurtre',
  nationalisme: 'Nationalisme',
  identitaire: 'Identitaire',
  supremacisme_blanc: 'Suprémacisme blanc',
  neonazisme: 'Néonazisme',
  fascisme: 'Fascisme',
  neofascisme: 'Néofascisme',
  traditionalisme: 'Traditionalisme réactionnaire',
  integrisme_religieux: 'Intégrisme religieux',
  royalisme_extreme_droite: "Royalisme d'extrême droite",
  conspirationnisme: 'Conspirationnisme',
  masculinisme: 'Masculinisme',
  accelerationnisme: 'Accélérationnisme',
  autre: 'Autre'
}

async function fetchJSON(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login'
        throw new Error('Connexion requise')
      }

      let errorMessage = `Erreur serveur: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.errors?.[0]?.msg || errorMessage
      } catch (_) {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }
      const error = new Error(errorMessage)
      error.status = response.status
      throw error
    }

    return response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Le serveur ne répond pas. Vérifie que le backend est lancé.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function uploadVideoProof(file) {
  if (!file) return null

  const extension = file.name.split('.').pop()?.toLowerCase()
  const videoType = allowedVideoTypes.has(file.type) ? file.type : videoTypeByExtension[extension]

  if (!videoType) {
    throw new Error('Format vidéo non autorisé. Utilise MP4, WebM, MOV ou M4V.')
  }

  if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
    throw new Error(`Vidéo trop lourde. Maximum: ${VIDEO_UPLOAD_MAX_MB} Mo.`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2 * 60 * 60 * 1000)

  try {
    const response = await fetch(`${API_URL}/proofs/video`, {
      method: 'POST',
      headers: {
        'Content-Type': videoType,
        'X-File-Name': encodeURIComponent(file.name)
      },
      body: file,
      signal: controller.signal
    })

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login'
        throw new Error('Connexion requise')
      }

      let errorMessage = `Erreur upload vidéo: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (_) {}
      const error = new Error(errorMessage)
      error.status = response.status
      throw error
    }

    return response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Upload vidéo trop long. Réessaie avec un fichier plus léger.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function updateConnectionStatus(status) {
  if (!connectionStatus) return
  const [dot, text] = connectionStatus.children
  
  switch (status) {
    case 'connecting':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-yellow-500'
      text.textContent = 'Connexion à Fachopol...'
      text.className = 'text-gray-400'
      break
    case 'connected':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-green-500'
      text.textContent = 'Connecté à Fachopol'
      text.className = 'text-gray-400'
      setTimeout(() => {
        connectionStatus.style.opacity = '0'
        setTimeout(() => connectionStatus.style.display = 'none', 1000)
      }, 2000)
      break
    case 'error':
      dot.className = 'inline-block w-2 h-2 rounded-full bg-red-500'
      text.textContent = 'Déconnecté de Fachopol'
      text.className = 'text-red-400'
      connectionStatus.style.display = 'flex'
      connectionStatus.style.opacity = '1'
      break
  }
}

function switchTab(tab) {
  const isDesktop = window.innerWidth >= 1024
  if (isDesktop || !panelList || !panelForm || !tabList || !tabForm) return
  const activeElement = document.activeElement
  if (activeElement && typeof activeElement.blur === 'function') {
    activeElement.blur()
  }

  if (tab === 'list') {
    panelList.classList.remove('hidden')
    panelForm.classList.add('hidden')
    tabList.classList.add('active', 'text-red-400')
    tabList.classList.remove('text-gray-500')
    tabForm.classList.remove('active', 'text-red-400')
    tabForm.classList.add('text-gray-500')
  } else {
    panelForm.classList.remove('hidden')
    panelList.classList.add('hidden')
    tabForm.classList.add('active', 'text-red-400')
    tabForm.classList.remove('text-gray-500')
    tabList.classList.remove('active', 'text-red-400')
    tabList.classList.add('text-gray-500')
  }
}

function initLayout() {
  if (!panelList || !panelForm) return

  const isDesktop = window.innerWidth >= 1024
  if (isDesktop) {
    panelList.classList.remove('hidden')
    panelForm.classList.remove('hidden')
  } else {
    panelList.classList.remove('hidden')
    panelForm.classList.add('hidden')
  }
}

// Test de connexion au serveur avec retry
async function testConnection(retries = 3) {
  updateConnectionStatus('connecting')
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Tentative de connexion ${i + 1}/${retries}...`)
      await fetchJSON(`${API_URL}/fachos`, { headers })
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
  if (message) {
    message.textContent = "Impossible de se connecter au serveur. Lance `npm run server` puis recharge la page."
    message.classList.add('text-red-400')
  }
  updateConnectionStatus('error')
  return false
}

function normalizePseudo(pseudo = '') {
  return pseudo.trim().replace(/^@+/, '').toLowerCase()
}

function getFilters() {
  return {
    query: searchInput?.value.trim().toLowerCase() || '',
    status: statusFilter?.value || '',
    categorie: categoryFilter?.value || '',
    dateFrom: dateFromFilter?.value || '',
    dateTo: dateToFilter?.value || ''
  }
}

function matchesDate(f, filters) {
  if (!filters.dateFrom && !filters.dateTo) return true

  const created = new Date(f.created_at)
  if (Number.isNaN(created.getTime())) return false

  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00`)
    if (created < from) return false
  }

  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T23:59:59`)
    if (created > to) return false
  }

  return true
}

function getFilteredFachos() {
  const filters = getFilters()

  return fachos.filter(f => {
    const queryTarget = [
      f.pseudo,
      f.nickname,
      f.preuve,
      f.preuve_video_name,
      normalizeVideos(f).map(video => video.name).join(' '),
      f.lien,
      categoryLabels[f.categorie] || f.categorie,
      statusLabels[f.status] || f.status
    ].join(' ').toLowerCase()

    return (!filters.query || queryTarget.includes(filters.query)) &&
      (!filters.status || (f.status || 'a_verifier') === filters.status) &&
      (!filters.categorie || (f.categorie || 'autre') === filters.categorie) &&
      matchesDate(f, filters)
  })
}

function renderList() {
  listContainer.innerHTML = ''

  const filtered = getFilteredFachos()
  if (resultCount) {
    resultCount.textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="text-sm font-medium">Aucun compte trouvé</p>
      </div>`
    return
  }

  filtered.forEach(f => {
    const status = f.status || 'a_verifier'
    const categorie = f.categorie || 'autre'
    const videos = normalizeVideos(f)
    const videoBlock = videos.length > 0 ? `
        <div class="mt-4 space-y-3">
          ${videos.map((video, index) => `
          <div class="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <video class="proof-video w-full max-h-80 bg-black" controls preload="metadata" playsinline src="${escapeHTML(video.path)}"></video>
            <div class="flex items-center justify-between gap-3 px-3 py-2 border-t border-white/10">
              <span class="text-xs text-gray-400 truncate">${escapeHTML(video.name || `Preuve vidéo ${index + 1}`)}</span>
              <a class="text-[11px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-400 transition-colors shrink-0"
                 href="${escapeHTML(video.path)}" target="_blank" rel="noopener noreferrer">
                Ouvrir
              </a>
            </div>
          </div>
          `).join('')}
        </div>
    ` : ''
    const div = document.createElement('div')
    div.className = 'card-animation list-wrapper'
    div.dataset.fachoId = f.id
    div.innerHTML = `
      <div class="facho-card p-5 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0 flex items-center justify-center relative">
              <svg class="w-5 h-5 text-red-500/60 absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ${f.avatar ? `<img src="${escapeHTML(avatarSrc(f.avatar))}" alt="Avatar" class="avatar-img w-full h-full object-cover relative z-10">` : ''}
            </div>
            <div>
              <h3 class="text-base font-bold text-white font-['Outfit'] leading-tight">${escapeHTML(f.nickname || f.pseudo)}</h3>
              <span class="text-xs text-red-400/80 font-medium">@${escapeHTML(f.pseudo.replace(/^@/, ''))}</span>
            </div>
          </div>
          <span class="text-[11px] font-medium px-2.5 py-1 bg-white/5 rounded-full border border-white/10 text-gray-500 whitespace-nowrap shrink-0">
            ${new Date(f.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <span class="badge badge-status-${escapeHTML(status)}">${escapeHTML(statusLabels[status] || status)}</span>
          <span class="badge">${escapeHTML(categoryLabels[categorie] || categorie)}</span>
        </div>

        <div class="mt-4 pl-3 border-l border-white/10">
          <p class="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">${escapeHTML(f.preuve)}</p>
        </div>

        ${videoBlock}

        <div class="mt-4 pt-3 border-t border-white/8 flex flex-wrap items-center justify-between gap-3">
          <a class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-400 transition-colors"
             href="${escapeHTML(f.lien)}" target="_blank" rel="noopener noreferrer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Voir le profil TikTok
          </a>
          <button type="button" class="edit-btn" data-edit-id="${f.id}">
            Modifier
          </button>
        </div>
      </div>
    `
    listContainer.appendChild(div)
  })

  listContainer.querySelectorAll('.avatar-img').forEach(img => {
    img.addEventListener('error', () => {
      img.remove()
    }, { once: true })
  })
}

function setFormMode(mode, facho = null) {
  if (mode === 'edit' && facho) {
    editingId = facho.id
    formTitle.lastChild.textContent = ' Modifier le signalement'
    submitLabel.textContent = 'ENREGISTRER'
    cancelEdit.classList.remove('hidden')
    form.pseudo.value = facho.pseudo || ''
    form.lien.value = facho.lien || ''
    form.preuve.value = facho.preuve || ''
    form.status.value = facho.status || 'a_verifier'
    form.categorie.value = facho.categorie || 'autre'
    const videos = normalizeVideos(facho)
    setFormVideos(videos)
    if (proofVideoInput) proofVideoInput.value = ''
    if (proofVideoCurrent) {
      proofVideoCurrent.textContent = videos.length > 0
        ? `${videos.length} vidéo${videos.length > 1 ? 's' : ''} déjà liée${videos.length > 1 ? 's' : ''}. Les nouveaux fichiers seront ajoutés.`
        : ''
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  editingId = null
  formTitle.lastChild.textContent = ' Signaler un facho'
  submitLabel.textContent = 'SIGNALER LE FACHO'
  cancelEdit.classList.add('hidden')
  form.reset()
  delete form.dataset.videos
  if (proofVideoCurrent) proofVideoCurrent.textContent = ''
}

async function loadFachos(newItemId = null) {
  try {
    console.log('Tentative de chargement des données...')
    fachos = await fetchJSON(`${API_URL}/fachos`, { headers })
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
    listContainer.innerHTML = `
      <div class="empty-state">
        <p class="text-sm font-medium text-red-400">Impossible de charger les données</p>
      </div>`
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  // Validation côté client
  const pseudo = form.pseudo.value.trim()
  const lien = form.lien.value.trim()
  const preuve = form.preuve.value.trim()
  const status = form.status.value
  const categorie = form.categorie.value

  // Validation basique
  if (pseudo.length < 3) {
    showError('Le pseudo doit contenir au moins 3 caractères')
    return
  }
  
  if (!isValidURL(lien)) {
    showError('Le lien doit être une URL valide')
    return
  }
  
  if (preuve.length < 10) {
    showError('La preuve doit contenir au moins 10 caractères')
    return
  }

  if (!pseudo || !lien || !preuve) {
    message.textContent = "Tous les champs sont requis."
    message.classList.remove('text-green-400')
    message.classList.add('text-red-400')
    return
  }

  const duplicate = fachos.find(f =>
    normalizePseudo(f.pseudo) === normalizePseudo(pseudo) &&
    Number(f.id) !== Number(editingId)
  )

  if (duplicate) {
    showError(`@${normalizePseudo(pseudo)} est déjà présent.`)
    const existingCard = document.querySelector(`[data-facho-id="${duplicate.id}"]`)
    existingCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  try {
    const selectedVideos = Array.from(proofVideoInput?.files || [])
    const videos = readFormVideos()

    for (const [index, selectedVideo] of selectedVideos.entries()) {
      message.textContent = `Upload vidéo ${index + 1}/${selectedVideos.length}...`
      message.classList.remove('text-red-400')
      message.classList.add('text-green-400')
      const uploadedVideo = await uploadVideoProof(selectedVideo)
      videos.push({
        path: uploadedVideo.path,
        name: uploadedVideo.name,
        type: uploadedVideo.type
      })
    }

    const firstVideo = videos[0] || { path: '', name: '', type: '' }

    const url = editingId ? `${API_URL}/fachos/${editingId}` : `${API_URL}/fachos`
    const savedFacho = await fetchJSON(url, {
      method: editingId ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify({
        pseudo,
        lien,
        preuve,
        status,
        categorie,
        preuves_videos: videos,
        preuve_video: firstVideo.path,
        preuve_video_name: firstVideo.name,
        preuve_video_type: firstVideo.type
      })
    })

    message.textContent = editingId ? "✅ Signalement modifié" : "✅ Compte ajouté avec succès"
    message.classList.remove('text-red-400')
    message.classList.add('text-green-400')
    setFormMode('create')
    await loadFachos(savedFacho.id) // Passer l'ID pour le mettre en évidence
  } catch (error) {
    console.error('Erreur:', error)
    message.textContent = error.status === 409 ? `Déjà présent: ${error.message}` : error.message
    message.classList.remove('text-green-400')
    message.classList.add('text-red-400')
  }
})

listContainer.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-id]')
  if (!editButton) return

  const facho = fachos.find(item => Number(item.id) === Number(editButton.dataset.editId))
  if (facho) {
    setFormMode('edit', facho)
    if (window.innerWidth < 1024) {
      switchTab('form')
    }
  }
})

cancelEdit.addEventListener('click', () => {
  setFormMode('create')
  message.textContent = ''
})

;[searchInput, statusFilter, categoryFilter, dateFromFilter, dateToFilter].forEach(input => {
  input?.addEventListener('input', renderList)
  input?.addEventListener('change', renderList)
})

clearFilters.addEventListener('click', () => {
  searchInput.value = ''
  statusFilter.value = ''
  categoryFilter.value = ''
  dateFromFilter.value = ''
  dateToFilter.value = ''
  renderList()
})

logoutBtn?.addEventListener('click', async () => {
  try {
    await fetchJSON(`${API_URL}/logout`, {
      method: 'POST',
      headers
    })
  } finally {
    window.location.href = '/login'
  }
})

proofVideoInput?.addEventListener('change', () => {
  const files = Array.from(proofVideoInput.files || [])
  if (!proofVideoCurrent) return

  if (files.length === 0) {
    const videos = readFormVideos()
    proofVideoCurrent.textContent = videos.length > 0
      ? `${videos.length} vidéo${videos.length > 1 ? 's' : ''} déjà liée${videos.length > 1 ? 's' : ''}.`
      : ''
    return
  }

  const totalMb = files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)
  proofVideoCurrent.textContent = `${files.length} nouvelle${files.length > 1 ? 's' : ''} vidéo${files.length > 1 ? 's' : ''} sélectionnée${files.length > 1 ? 's' : ''} (${totalMb.toFixed(1)} Mo)`
})

tabList?.addEventListener('click', () => switchTab('list'))
tabForm?.addEventListener('click', () => switchTab('form'))
window.addEventListener('resize', initLayout)
initLayout()

form?.addEventListener('submit', () => {
  if (window.innerWidth < 1024) {
    setTimeout(() => switchTab('list'), 1500)
  }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW enregistré:', reg.scope))
      .catch(err => console.warn('SW échec:', err))
  })
}

// Fonctions utilitaires
function isValidURL(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

function showError(message) {
  const messageEl = document.getElementById('message')
  messageEl.textContent = message
  messageEl.classList.remove('text-green-400')
  messageEl.classList.add('text-red-400')
  setTimeout(() => {
    messageEl.textContent = ''
  }, 5000)
}

async function initApp() {
  const connected = await testConnection()
  if (connected) {
    await loadFachos()
  }
}

initApp()
