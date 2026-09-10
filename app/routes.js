//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

router.get('/', function (req, res) {
  const topicTags = req.session.data.topicTags || []
  const departments = req.session.data.departments || []

  let selected = req.query.filter || []
  if (!Array.isArray(selected)) {
    selected = [selected]
  }
  selected = selected.filter(Boolean)

  const buildHref = function (slug) {
    const next = selected.indexOf(slug) !== -1
      ? selected.filter(function (s) { return s !== slug })
      : selected.concat(slug)
    if (next.length === 0) {
      return req.path
    }
    return req.path + '?' + next.map(function (s) {
      return 'filter=' + encodeURIComponent(s)
    }).join('&')
  }

  const filters = topicTags.map(function (tag) {
    return {
      label: tag.name + ' (' + tag.count + ')',
      href: buildHref(tag.slug),
      filter: tag.slug,
      selected: selected.indexOf(tag.slug) !== -1
    }
  })

  const departmentItems = departments.map(function (department) {
    return Object.assign({}, department, {
      hidden: selected.length > 0 && selected.indexOf(department.taxonomy) === -1
    })
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
