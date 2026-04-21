<template>
  <section class="section narrow">
    <p class="eyebrow">MVP demo</p>
    <h1>Lokasyon bazli talep ve task akisi</h1>
    <p class="lead">
      Public QR akisi acik kalir. Personel ve admin ekranlari ise JWT ile korunur.
    </p>

    <div class="quick-actions">
      <NuxtLink class="button primary" to="/q/room-401-demo-token">401 Oda QR</NuxtLink>
      <NuxtLink class="button" to="/q/room-402-demo-token">402 Oda QR</NuxtLink>
      <NuxtLink class="button" to="/login">Personel login</NuxtLink>
      <NuxtLink class="button" to="/admin/tasks">Task listesi</NuxtLink>
    </div>
  </section>
</template>
