<script setup lang="ts">
const auth = useAuth();
const route = useRoute();

const existingUser = await auth.restoreSession();
if (existingUser) {
  await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/tasks');
}

const email = ref('admin@example.com');
const password = ref('Admin123!');
const rememberMe = ref(true);
const formError = ref('');
const helpMessage = ref('');
const submitting = ref(false);

async function submit() {
  formError.value = '';
  helpMessage.value = '';
  submitting.value = true;

  try {
    await auth.login({
      email: email.value,
      password: password.value
    }, {
      remember: rememberMe.value
    });

    await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/tasks');
  } catch (error) {
    formError.value = getApiErrorMessage(error, 'Giriş başarısız.');
  } finally {
    submitting.value = false;
  }
}

function showPasswordHelp() {
  formError.value = '';
  helpMessage.value = 'Şifre yenileme için sistem yöneticisinden kullanıcı kartından yeni şifre belirlemesini iste.';
}
</script>

<template>
  <section class="section narrow login-screen">
    <div class="login-brand">
      <img class="login-brand-logo" src="/qr-logo.svg" alt="QR Talep logosu" />
      <h1>QR Talep</h1>
      <p>Talep ve Görev Yönetimi</p>
    </div>

    <div class="panel auth-card">
      <div>
        <h2>Hesabınıza Giriş Yapın</h2>
      </div>

      <form class="section" @submit.prevent="submit">
        <div>
          <label for="email">E-POSTA ADRESİ</label>
          <input id="email" v-model="email" type="email" autocomplete="username" required />
        </div>

        <div>
          <label for="password">ŞİFRE</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" required />
        </div>

        <div class="login-action-row">
          <label class="remember-me">
            <input v-model="rememberMe" type="checkbox" />
            <span>Beni Hatırla</span>
          </label>
          <button class="login-help-button" type="button" @click="showPasswordHelp">Şifremi Unuttum?</button>
        </div>

        <div class="form-actions">
          <button class="button primary" type="submit" :disabled="submitting">
            {{ submitting ? 'Giriş yapılıyor...' : 'Giriş yap' }}
          </button>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>
        <p v-if="helpMessage" class="info-text">{{ helpMessage }}</p>
      </form>
    </div>

    <p class="login-footer">© 2026 QR Talep. Tüm hakları saklıdır.</p>
  </section>
</template>
