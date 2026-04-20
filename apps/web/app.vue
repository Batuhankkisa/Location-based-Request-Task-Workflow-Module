<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">Location Workflow</NuxtLink>
      <nav class="nav-links" aria-label="Ana gezinme">
        <NuxtLink to="/q/room-401-demo-token">401 QR</NuxtLink>
        <NuxtLink to="/admin/tasks">Tasklar</NuxtLink>
        <NuxtLink to="/admin/locations">Lokasyonlar</NuxtLink>
      </nav>
    </header>

    <main class="page">
      <NuxtPage />
    </main>
  </div>
</template>
