<script setup lang="ts">
const auth = useAuth();
const route = useRoute();

const existingUser = await auth.restoreSession();
if (existingUser) {
  await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/tasks');
}

const email = ref('admin@example.com');
const password = ref('Admin123!');
const formError = ref('');
const submitting = ref(false);

async function submit() {
  formError.value = '';
  submitting.value = true;

  try {
    await auth.login({
      email: email.value,
      password: password.value
    });

    await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/tasks');
  } catch (error) {
    formError.value = getApiErrorMessage(error, 'Login basarisiz.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="section narrow">
    <div class="panel auth-card">
      <div>
        <p class="eyebrow">Personel girisi</p>
        <h1>Admin ve personel login</h1>
        <p class="lead">
          Korumali task, QR ve lokasyon ekranlari icin JWT tabanli oturum ac.
        </p>
      </div>

      <form class="section" @submit.prevent="submit">
        <div>
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="username" required />
        </div>

        <div>
          <label for="password">Sifre</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" required />
        </div>

        <div class="form-actions">
          <button class="button primary" type="submit" :disabled="submitting">
            {{ submitting ? 'Giris yapiliyor...' : 'Giris yap' }}
          </button>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>
      </form>
    </div>
  </section>
</template>
