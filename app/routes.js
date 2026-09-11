//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const { fetchBrowseData } = require('./lib/rosetta')

router.get('/', async function (req, res) {
  let subjects = []
  let departments = []

  try {
    const data = await fetchBrowseData()
    subjects = data.subjects
    departments = data.departments
  } catch (error) {
    console.error('Failed to load browse data from the search API:', error.message)
  }

  subjects.sort(function (a, b) { return a.name.localeCompare(b.name) })
  departments.sort(function (a, b) {
    return (a.code || '').localeCompare(b.code || '')
  })

  let selected = req.query.filter || []
  if (!Array.isArray(selected)) {
    selected = [selected]
  }
  selected = selected.filter(Boolean)

  const buildHref = function (name) {
    const next = selected.indexOf(name) !== -1
      ? selected.filter(function (s) { return s !== name })
      : selected.concat(name)
    if (next.length === 0) {
      return req.path
    }
    return req.path + '?' + next.map(function (s) {
      return 'filter=' + encodeURIComponent(s)
    }).join('&')
  }

  const filters = subjects.map(function (subject) {
    return {
      label: subject.name + ' (' + subject.count + ')',
      href: buildHref(subject.name),
      filter: subject.name,
      selected: selected.indexOf(subject.name) !== -1
    }
  })

  const departmentItems = departments.map(function (department) {
    const matches = department.subjects.some(function (subject) {
      return selected.indexOf(subject) !== -1
    })
    return {
      name: department.name,
      code: department.code,
      href: '#',
      subjects: department.subjects,
      hidden: selected.length > 0 && !matches
    }
  })

  const resultCount = departmentItems.filter(function (department) {
    return !department.hidden
  }).length

  res.render('index', {
    filters: filters,
    departmentItems: departmentItems,
    resultCount: resultCount
  })
})
