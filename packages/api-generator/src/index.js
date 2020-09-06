const Vue = require('vue')
const Vuetify = require('vuetify')
const { hyphenate, pascalize } = require('./helpers/text')
const { parseComponent, parseSassVariables, parseGlobalSassVariables } = require('./helpers/parsing')
const deepmerge = require('./helpers/merge')

Vue.use(Vuetify)

const loadLocale = (componentName, locale, fallback = {}) => {
  try {
    const data = require(`./locale/${locale}/${componentName}`)
    return Object.assign(fallback, data)
  } catch (err) {
    return fallback
  }
}

const loadMap = (componentName, fallback = {}) => {
  try {
    const map = require(`./maps/${componentName}`)
    return Object.assign(fallback, map[componentName])
  } catch {
    return fallback
  }
}

const addComponentApiDescriptions = (componentName, api, locales) => {
  for (const localeName of locales) {
    const sources = [
      loadLocale(componentName, localeName),
      ...api.mixins.map(mixin => loadLocale(mixin, localeName)),
      loadLocale('generic', localeName),
    ]

    for (const category of ['props', 'events', 'slots', 'functions', 'sass']) {
      for (const item of api[category]) {
        let description = ''
        if (category === 'sass') {
          description = (sources[0] && sources[0][category] && sources[0][category][item.name]) || ''
        } else {
          description = sources.reduce((str, source) => {
            if (str) return str
            return source[category] && source[category][item.name]
          }, null)
        }

        if (!item.description) item.description = {}

        item.description[localeName] = description || ''
      }
    }
  }

  return api
}

const addDirectiveApiDescriptions = (directiveName, api, locales) => {
  if (api.argument) {
    for (const localeName of locales) {
      const source = loadLocale(directiveName, localeName)
      if (!api.argument.description) api.argument.description = {}

      api.argument.description[localeName] = source.argument || ''
    }
  }

  if (api.modifiers) {
    api = addGenericApiDescriptions(directiveName, api, locales, ['modifiers'])
  }

  return api
}

const addGenericApiDescriptions = (name, api, locales, categories) => {
  for (const localeName of locales) {
    const source = loadLocale(name, localeName)
    for (const category of categories) {
      for (const item of api[category]) {
        if (!item.description) item.description = {}

        item.description[localeName] = source[category] ? source[category][item.name] : ''
      }
    }
  }

  return api
}

const getComponentApi = (componentName, locales) => {
  const pascalName = pascalize(componentName)

  let component = Vue.options._base.options.components[pascalName]

  if (component.options.$_wrapperFor) {
    component = component.options.$_wrapperFor
  }

  if (!component) throw new Error(`Could not find component: ${componentName}`)

  const propsAndMixins = parseComponent(component)
  const slotsEventsAndFunctions = loadMap(componentName, { slots: [], events: [], functions: [] })
  const sassVariables = parseSassVariables(componentName)

  const api = deepmerge(propsAndMixins, slotsEventsAndFunctions, { name: componentName, sass: sassVariables, component: true })

  return addComponentApiDescriptions(componentName, api, locales)
}

const getDirectiveApi = (directiveName, locales) => {
  const pascalName = pascalize(directiveName.slice(2))

  const directive = Vue.options._base.options.directives[pascalName]

  if (!directive) throw new Error(`Could not find directive: ${directiveName}`)

  const api = deepmerge(loadMap(directiveName), { name: directiveName, directive: true })

  return addDirectiveApiDescriptions(directiveName, api, locales)
}

const getVuetifyApi = locales => {
  const api = loadMap('$vuetify')

  return addGenericApiDescriptions('$vuetify', api, locales, ['functions'])
}

const DIRECTIVES = ['v-mutate', 'v-intersect', 'v-ripple', 'v-resize', 'v-scroll', 'v-touch', 'v-click-outside']

const getApi = (name, locales) => {
  if (name === '$vuetify') return getVuetifyApi(locales)
  if (DIRECTIVES.includes(name)) return getDirectiveApi(name, locales)
  else return getComponentApi(name, locales)
}

const EXCLUDES = ['VMessages', 'VLabel']

const getComponentsApi = locales => {
  const components = []
  const installedComponents = Vue.options._base.options.components
  const componentNameRegex = /^(?:V[A-Z]|v-[a-z])/

  for (const componentName in installedComponents) {
    if (!componentNameRegex.test(componentName)) continue
    if (EXCLUDES.includes(componentName)) continue

    const kebabName = hyphenate(componentName)

    components.push(getComponentApi(kebabName, locales))
  }

  return components
}

const getDirectivesApi = locales => {
  const directives = []

  for (const directiveName of DIRECTIVES) {
    directives.push(getDirectiveApi(directiveName, locales))
  }

  return directives
}

const getGlobalSassVariables = locales => {
  const items = parseGlobalSassVariables()

  return items.map(item => addGenericApiDescriptions(item.name, item, locales, ['sass']))
}

const getCompleteApi = locales => {
  return {
    items: [
      getVuetifyApi(locales),
      ...getComponentsApi(locales),
      ...getDirectivesApi(locales),
    ].sort((a, b) => a.name.localeCompare(b.name)),
    globalSass: getGlobalSassVariables(locales),
  }
}

// function genMissingDescriptions (comp, name, missing) {
//   if (missing) {
//     if (!missingDescriptions[comp]) {
//       missingDescriptions[comp] = []
//     }
//     if (missingDescriptions[comp] && !missingDescriptions[comp].includes(name)) {
//       missingDescriptions[comp].push(name)
//     }
//   }
// }

module.exports = {
  getApi,
  getCompleteApi,
  getComponentsApi,
  getDirectivesApi,
}
