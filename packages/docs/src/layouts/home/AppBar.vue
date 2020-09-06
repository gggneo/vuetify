<template>
  <v-app-bar
    id="home-app-bar"
    :color="dark ? undefined : 'white'"
    app
    class="v-bar--underline"
    flat
  >
    <vuetify-logo />

    <v-spacer />

    <template v-if="!$vuetify.breakpoint.smAndDown || search">
      <default-search />

      <vertical-divider />
    </template>

    <learn-menu />

    <team-link />

    <support-menu />

    <enterprise-link />

    <vertical-divider />

    <language-menu />
  </v-app-bar>
</template>

<script>
  // Utilities
  import { get, sync } from 'vuex-pathify'

  export default {
    name: 'HomeBar',

    components: {
      DefaultSearch: () => import(
        /* webpackChunkName: "default-search" */
        '@/layouts/default/Search'
      ),
    },

    computed: {
      dark: sync('user/theme@dark'),
      search: get('app/search'),
    },
  }
</script>
